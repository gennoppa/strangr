package com.strangerchat.config;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * All tunables live under the {@code app.*} prefix in application.yml.
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        @DefaultValue({"http://localhost:5173", "http://localhost:8080"}) List<String> allowedOrigins,
        @DefaultValue("false") boolean trustProxyHeaders,
        Matching matching,
        Moderation moderation,
        List<IceServer> iceServers) {

    public AppProperties {
        if (matching == null) matching = new Matching(Duration.ofSeconds(8));
        if (moderation == null) moderation = new Moderation(3, Duration.ofHours(1), Duration.ofHours(24));
        if (iceServers == null || iceServers.isEmpty()) {
            iceServers = List.of(new IceServer(List.of("stun:stun.l.google.com:19302"), null, null));
        }
    }

    /** @param interestWait how long a user with interests waits for a shared-interest match before going random */
    public record Matching(@DefaultValue("8s") Duration interestWait) {}

    /**
     * @param reportThreshold distinct reporters needed to ban an IP
     * @param reportWindow    reports older than this are forgotten
     * @param banDuration     how long a ban lasts
     */
    public record Moderation(
            @DefaultValue("3") int reportThreshold,
            @DefaultValue("1h") Duration reportWindow,
            @DefaultValue("24h") Duration banDuration) {}

    /** Passed straight to the browser's RTCPeerConnection. Add a TURN server for production. */
    public record IceServer(List<String> urls, String username, String credential) {}
}
