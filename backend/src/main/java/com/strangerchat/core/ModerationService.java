package com.strangerchat.core;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * In-memory report tracking and temporary IP bans.
 * <p>
 * An IP is banned when it has been reported by {@code threshold} <em>distinct</em> IPs within
 * {@code window}. Reports from the reported IP itself are ignored so users behind the same
 * NAT (or local testing) cannot ban each other.
 */
public class ModerationService {

    private record Report(String reporterIp, Instant at) {}

    private final Clock clock;
    private final int threshold;
    private final Duration window;
    private final Duration banDuration;

    private final Map<String, Deque<Report>> reports = new HashMap<>();
    private final Map<String, Instant> bans = new HashMap<>();

    public ModerationService(Clock clock, int threshold, Duration window, Duration banDuration) {
        this.clock = clock;
        this.threshold = Math.max(1, threshold);
        this.window = window;
        this.banDuration = banDuration;
    }

    /**
     * Records a report.
     *
     * @return the ban expiry if this report caused a new ban, otherwise empty
     */
    public synchronized Optional<Instant> report(String reporterIp, String reportedIp) {
        if (reporterIp == null || reportedIp == null || reporterIp.equals(reportedIp)) {
            return Optional.empty();
        }
        Instant now = clock.instant();
        Deque<Report> list = reports.computeIfAbsent(reportedIp, k -> new ArrayDeque<>());
        prune(list, now);
        boolean alreadyReported = list.stream().anyMatch(r -> r.reporterIp().equals(reporterIp));
        if (!alreadyReported) {
            list.addLast(new Report(reporterIp, now));
        }
        if (list.size() >= threshold) {
            Instant until = now.plus(banDuration);
            bans.put(reportedIp, until);
            reports.remove(reportedIp);
            return Optional.of(until);
        }
        return Optional.empty();
    }

    /** @return ban expiry if the IP is currently banned */
    public synchronized Optional<Instant> bannedUntil(String ip) {
        if (ip == null) return Optional.empty();
        Instant until = bans.get(ip);
        if (until == null) return Optional.empty();
        if (!until.isAfter(clock.instant())) {
            bans.remove(ip);
            return Optional.empty();
        }
        return Optional.of(until);
    }

    /** Drops expired bans and stale reports; call periodically. */
    public synchronized void cleanup() {
        Instant now = clock.instant();
        bans.values().removeIf(until -> !until.isAfter(now));
        reports.values().forEach(list -> prune(list, now));
        reports.values().removeIf(Deque::isEmpty);
    }

    private void prune(Deque<Report> list, Instant now) {
        Instant cutoff = now.minus(window);
        while (!list.isEmpty() && list.peekFirst().at().isBefore(cutoff)) {
            list.pollFirst();
        }
    }
}
