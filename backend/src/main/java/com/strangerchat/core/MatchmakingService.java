package com.strangerchat.core;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Pairs strangers and relays messages between partners.
 * <p>
 * Matching rules:
 * <ul>
 *   <li>A user who entered interests only matches someone sharing at least one interest during the
 *       first {@code interestWait} of waiting; after that they fall back to anyone.</li>
 *   <li>Users never match someone they (or who) blocked/reported.</li>
 *   <li>Right after "Next", you won't be re-paired with the stranger you just left until the
 *       wait window passes (so two lone users still reconnect eventually).</li>
 * </ul>
 * All state changes happen under a single lock; the service is cheap enough that this is fine for
 * thousands of concurrent users on one node. Scale-out would move the queue to Redis.
 */
public class MatchmakingService {

    public static final int MAX_INTERESTS = 10;
    public static final int MAX_INTEREST_LENGTH = 30;
    public static final int MAX_CHAT_LENGTH = 1000;

    private final Clock clock;
    private final Duration interestWait;
    private final ModerationService moderation;

    private final Map<String, Client> clients = new ConcurrentHashMap<>();
    /** FIFO of waiting clients (insertion ordered). */
    private final Map<String, Client> waiting = new LinkedHashMap<>();

    public MatchmakingService(Clock clock, Duration interestWait, ModerationService moderation) {
        this.clock = clock;
        this.interestWait = interestWait;
        this.moderation = moderation;
    }

    // ------------------------------------------------------------------ lifecycle

    /** @return false if the client is banned (it has been notified and closed). */
    public synchronized boolean connect(Client c) {
        Optional<Instant> ban = moderation.bannedUntil(c.ip());
        if (ban.isPresent()) {
            c.send(Map.of("type", "banned", "until", ban.get().toString()));
            c.sender().close();
            return false;
        }
        clients.put(c.id(), c);
        c.send(Map.of("type", "hello", "id", c.id()));
        return true;
    }

    public synchronized void disconnect(String clientId) {
        Client c = clients.remove(clientId);
        if (c == null) return;
        endChat(c);
        waiting.remove(c.id());
        c.state(Client.State.IDLE);
    }

    public int onlineCount() {
        return clients.size();
    }

    // ------------------------------------------------------------------ commands

    /** Start (or restart) searching with the given interests. */
    public synchronized void join(String clientId, Iterable<String> rawInterests) {
        Client c = clients.get(clientId);
        if (c == null) return;
        if (kickIfBanned(c)) return;
        c.interests(sanitizeInterests(rawInterests));
        endChat(c);
        enqueue(c);
    }

    /** Leave the current stranger and immediately look for a new one. */
    public synchronized void next(String clientId) {
        Client c = clients.get(clientId);
        if (c == null) return;
        if (kickIfBanned(c)) return;
        endChat(c);
        enqueue(c);
    }

    /** Stop chatting / searching entirely. */
    public synchronized void stop(String clientId) {
        Client c = clients.get(clientId);
        if (c == null) return;
        endChat(c);
        waiting.remove(c.id());
        c.state(Client.State.IDLE);
        c.send(Map.of("type", "stopped"));
    }

    /** Relay an opaque WebRTC signaling payload (offer / answer / ICE candidate) to the partner. */
    public synchronized void signal(String clientId, Object data) {
        Client p = partnerOf(clientId);
        if (p == null || data == null) return;
        Map<String, Object> msg = new LinkedHashMap<>();
        msg.put("type", "signal");
        msg.put("data", data);
        p.send(msg);
    }

    public synchronized void chat(String clientId, String text) {
        Client p = partnerOf(clientId);
        if (p == null || text == null) return;
        String trimmed = text.strip();
        if (trimmed.isEmpty()) return;
        if (trimmed.length() > MAX_CHAT_LENGTH) trimmed = trimmed.substring(0, MAX_CHAT_LENGTH);
        p.send(Map.of("type", "chat", "text", trimmed));
    }

    public synchronized void typing(String clientId, boolean typing) {
        Client p = partnerOf(clientId);
        if (p == null) return;
        p.send(Map.of("type", "typing", "typing", typing));
    }

    /** Block the current partner (never match again this session) and end the chat. */
    public synchronized void block(String clientId) {
        Client c = clients.get(clientId);
        if (c == null || c.partner() == null) return;
        c.block(c.partner());
        endChat(c);
        c.state(Client.State.IDLE);
        c.send(Map.of("type", "blocked"));
    }

    /** Report + block the current partner. Enough distinct reports ban the partner's IP. */
    public synchronized void report(String clientId, String reason) {
        Client c = clients.get(clientId);
        if (c == null || c.partner() == null) return;
        Client offender = c.partner();
        c.block(offender);
        endChat(c);
        c.state(Client.State.IDLE);
        c.send(Map.of("type", "reported"));

        moderation.report(c.ip(), offender.ip()).ifPresent(until -> {
            // Kick every connection from the banned IP.
            for (Client other : new ArrayList<>(clients.values())) {
                if (offender.ip().equals(other.ip())) {
                    endChat(other);
                    waiting.remove(other.id());
                    clients.remove(other.id());
                    other.send(Map.of("type", "banned", "until", until.toString()));
                    other.sender().close();
                }
            }
        });
    }

    /** Periodic pass that retries matching (so interest-only waiters fall back to random). */
    public synchronized void tick() {
        for (Client c : new ArrayList<>(waiting.values())) {
            if (c.state() == Client.State.WAITING) {
                tryMatch(c);
            }
        }
    }

    // ------------------------------------------------------------------ internals

    private void enqueue(Client c) {
        waiting.remove(c.id());
        c.state(Client.State.WAITING);
        c.waitingSince(clock.instant());
        if (!tryMatch(c)) {
            waiting.put(c.id(), c);
            c.send(Map.of("type", "waiting", "interests", List.copyOf(c.interests())));
        }
    }

    private boolean tryMatch(Client c) {
        Instant now = clock.instant();
        for (Client other : waiting.values()) {
            if (other == c || other.state() != Client.State.WAITING) continue;
            Set<String> common = commonInterests(c, other);
            if (compatible(c, other, common, now)) {
                pair(other, c, common); // the one who waited longer initiates the WebRTC offer
                return true;
            }
        }
        return false;
    }

    private boolean compatible(Client a, Client b, Set<String> common, Instant now) {
        if (a.hasBlocked(b) || b.hasBlocked(a)) return false;
        boolean freshA = isFresh(a, now);
        boolean freshB = isFresh(b, now);
        boolean recentPair = b.id().equals(a.lastPartnerId()) || a.id().equals(b.lastPartnerId());
        if (recentPair && (freshA || freshB)) return false;
        boolean strictA = freshA && !a.interests().isEmpty();
        boolean strictB = freshB && !b.interests().isEmpty();
        return common.isEmpty() ? !(strictA || strictB) : true;
    }

    private boolean isFresh(Client c, Instant now) {
        return c.waitingSince() != null && Duration.between(c.waitingSince(), now).compareTo(interestWait) < 0;
    }

    private static Set<String> commonInterests(Client a, Client b) {
        Set<String> common = new LinkedHashSet<>(a.interests());
        common.retainAll(b.interests());
        return common;
    }

    private void pair(Client initiator, Client responder, Set<String> common) {
        waiting.remove(initiator.id());
        waiting.remove(responder.id());
        initiator.partner(responder);
        responder.partner(initiator);
        initiator.state(Client.State.CHATTING);
        responder.state(Client.State.CHATTING);
        List<String> commonList = List.copyOf(common);
        initiator.send(Map.of("type", "matched", "initiator", true, "commonInterests", commonList));
        responder.send(Map.of("type", "matched", "initiator", false, "commonInterests", commonList));
    }

    /** Ends the current chat (if any) and tells the partner. Does not requeue either side. */
    private void endChat(Client c) {
        Client p = c.partner();
        if (p == null) return;
        c.partner(null);
        p.partner(null);
        c.lastPartnerId(p.id());
        p.lastPartnerId(c.id());
        p.state(Client.State.IDLE);
        c.state(Client.State.IDLE);
        p.send(Map.of("type", "partner_left"));
    }

    private Client partnerOf(String clientId) {
        Client c = clients.get(clientId);
        return c == null ? null : c.partner();
    }

    private boolean kickIfBanned(Client c) {
        Optional<Instant> ban = moderation.bannedUntil(c.ip());
        if (ban.isEmpty()) return false;
        endChat(c);
        waiting.remove(c.id());
        clients.remove(c.id());
        c.send(Map.of("type", "banned", "until", ban.get().toString()));
        c.sender().close();
        return true;
    }

    static Set<String> sanitizeInterests(Iterable<String> raw) {
        Set<String> out = new LinkedHashSet<>();
        if (raw == null) return out;
        for (String s : raw) {
            if (s == null) continue;
            String t = s.strip().toLowerCase().replaceAll("\\s+", " ");
            if (t.isEmpty()) continue;
            if (t.length() > MAX_INTEREST_LENGTH) t = t.substring(0, MAX_INTEREST_LENGTH);
            out.add(t);
            if (out.size() >= MAX_INTERESTS) break;
        }
        return out;
    }
}
