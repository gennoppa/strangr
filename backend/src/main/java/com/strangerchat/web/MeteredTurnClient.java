package com.strangerchat.web;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Fetches TURN relay credentials from Metered (free tier: 20 GB/month) so video works between
 * different networks. The API key stays on the server; browsers only get the resulting ICE servers.
 * <p>
 * Enabled when both env vars are set:
 * <ul>
 *   <li>{@code METERED_APP} – your Metered app name, i.e. the {@code xxx} in {@code xxx.metered.live}</li>
 *   <li>{@code METERED_API_KEY} – the TURN credential API key from the Metered dashboard</li>
 * </ul>
 */
@Component
public class MeteredTurnClient {

    private static final Logger log = LoggerFactory.getLogger(MeteredTurnClient.class);
    private static final Duration CACHE_TTL = Duration.ofMinutes(30);

    private final String app;
    private final String apiKey;
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    private volatile List<Map<String, Object>> cached = List.of();
    private volatile Instant cachedAt = Instant.EPOCH;

    public MeteredTurnClient(@Value("${METERED_APP:}") String app,
                             @Value("${METERED_API_KEY:}") String apiKey,
                             ObjectMapper mapper) {
        this.app = app.strip().replaceAll("\\.metered\\.live.*$", "").replaceAll("^https?://", "");
        this.apiKey = apiKey.strip();
        this.mapper = mapper;
        if (isEnabled()) log.info("Metered TURN enabled for app '{}'", this.app);
        else log.info("Metered TURN not configured (set METERED_APP and METERED_API_KEY to enable)");
    }

    public boolean isEnabled() {
        return !app.isEmpty() && !apiKey.isEmpty();
    }

    /** @return TURN/STUN servers from Metered, or an empty list if disabled or unreachable. */
    public List<Map<String, Object>> iceServers() {
        if (!isEnabled()) return List.of();
        if (!cached.isEmpty() && Instant.now().isBefore(cachedAt.plus(CACHE_TTL))) return cached;
        synchronized (this) {
            if (!cached.isEmpty() && Instant.now().isBefore(cachedAt.plus(CACHE_TTL))) return cached;
            try {
                URI uri = URI.create("https://" + app + ".metered.live/api/v1/turn/credentials?apiKey="
                        + URLEncoder.encode(apiKey, StandardCharsets.UTF_8));
                HttpResponse<String> res = http.send(
                        HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(5)).GET().build(),
                        HttpResponse.BodyHandlers.ofString());
                if (res.statusCode() != 200) {
                    log.warn("Metered TURN request failed: HTTP {}", res.statusCode());
                    return cached; // keep serving the last good credentials, if any
                }
                cached = mapper.readValue(res.body(), new TypeReference<List<Map<String, Object>>>() {});
                cachedAt = Instant.now();
                log.info("Fetched {} ICE servers from Metered", cached.size());
            } catch (Exception e) {
                log.warn("Metered TURN request failed: {}", e.toString());
            }
            return cached;
        }
    }
}
