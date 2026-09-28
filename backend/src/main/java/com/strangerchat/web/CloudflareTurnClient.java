package com.strangerchat.web;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Fetches short-lived TURN relay credentials from Cloudflare Realtime
 * (free tier: 1,000 GB/month, then $0.05/GB). The API token never leaves the server.
 * <p>
 * Enabled when both env vars are set:
 * <ul>
 *   <li>{@code CF_TURN_KEY_ID} – the TURN key ID from the Cloudflare dashboard (Realtime → TURN Server)</li>
 *   <li>{@code CF_TURN_API_TOKEN} – that key's API token</li>
 * </ul>
 */
@Component
public class CloudflareTurnClient {

    private static final Logger log = LoggerFactory.getLogger(CloudflareTurnClient.class);

    /** Credentials are valid for 24 h; we refresh hourly so browsers always get plenty of validity left. */
    private static final int CREDENTIAL_TTL_SECONDS = 86_400;
    private static final Duration CACHE_TTL = Duration.ofHours(1);

    private final String keyId;
    private final String apiToken;
    private final String baseUrl;
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    private volatile List<Map<String, Object>> cached = List.of();
    private volatile Instant cachedAt = Instant.EPOCH;

    public CloudflareTurnClient(@Value("${CF_TURN_KEY_ID:}") String keyId,
                                @Value("${CF_TURN_API_TOKEN:}") String apiToken,
                                @Value("${CF_TURN_BASE_URL:https://rtc.live.cloudflare.com}") String baseUrl,
                                ObjectMapper mapper) {
        this.keyId = keyId.strip();
        this.apiToken = apiToken.strip();
        this.baseUrl = baseUrl.strip().replaceAll("/+$", "");
        this.mapper = mapper;
        if (isEnabled()) log.info("Cloudflare TURN enabled (key {}...)", this.keyId.substring(0, Math.min(6, this.keyId.length())));
        else log.info("Cloudflare TURN not configured (set CF_TURN_KEY_ID and CF_TURN_API_TOKEN to enable)");
    }

    public boolean isEnabled() {
        return !keyId.isEmpty() && !apiToken.isEmpty();
    }

    /** @return Cloudflare STUN/TURN servers, or an empty list if disabled or unreachable. */
    public List<Map<String, Object>> iceServers() {
        if (!isEnabled()) return List.of();
        if (!cached.isEmpty() && Instant.now().isBefore(cachedAt.plus(CACHE_TTL))) return cached;
        synchronized (this) {
            if (!cached.isEmpty() && Instant.now().isBefore(cachedAt.plus(CACHE_TTL))) return cached;
            try {
                HttpRequest req = HttpRequest.newBuilder(
                                URI.create(baseUrl + "/v1/turn/keys/" + keyId + "/credentials/generate-ice-servers"))
                        .timeout(Duration.ofSeconds(5))
                        .header("Authorization", "Bearer " + apiToken)
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString("{\"ttl\":" + CREDENTIAL_TTL_SECONDS + "}"))
                        .build();
                HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
                if (res.statusCode() / 100 != 2) {
                    log.warn("Cloudflare TURN request failed: HTTP {}", res.statusCode());
                    return cached; // keep serving the last good credentials, if any
                }
                Map<String, Object> body = mapper.readValue(res.body(), new TypeReference<Map<String, Object>>() {});
                List<Map<String, Object>> servers = sanitize(body.get("iceServers"));
                if (!servers.isEmpty()) {
                    cached = servers;
                    cachedAt = Instant.now();
                    log.info("Fetched {} ICE server entries from Cloudflare", servers.size());
                }
            } catch (Exception e) {
                log.warn("Cloudflare TURN request failed: {}", e.toString());
            }
            return cached;
        }
    }

    /**
     * Normalises Cloudflare's response and drops port-53 URLs, which browsers block
     * (they would only slow down connection setup).
     */
    @SuppressWarnings("unchecked")
    static List<Map<String, Object>> sanitize(Object iceServers) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (!(iceServers instanceof Collection<?> list)) return out;
        for (Object o : list) {
            if (!(o instanceof Map<?, ?> raw)) continue;
            Map<String, Object> server = new LinkedHashMap<>((Map<String, Object>) raw);
            List<String> urls = new ArrayList<>();
            Object u = server.get("urls");
            if (u instanceof String s) urls.add(s);
            else if (u instanceof Collection<?> c) c.forEach(x -> { if (x instanceof String s) urls.add(s); });
            urls.removeIf(CloudflareTurnClient::usesPort53);
            if (urls.isEmpty()) continue;
            server.put("urls", urls);
            out.add(server);
        }
        return out;
    }

    static boolean usesPort53(String url) {
        // e.g. "turn:turn.cloudflare.com:53?transport=udp"
        return url.matches("^[a-z]+:[^?]*:53(\\?.*)?$");
    }
}
