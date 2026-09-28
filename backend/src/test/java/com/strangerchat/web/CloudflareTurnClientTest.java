package com.strangerchat.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

class CloudflareTurnClientTest {

    @Test
    void dropsPort53UrlsAndKeepsCredentials() {
        Object response = List.of(
                Map.of("urls", List.of("stun:stun.cloudflare.com:3478", "stun:stun.cloudflare.com:53")),
                Map.of("urls", List.of(
                                "turn:turn.cloudflare.com:3478?transport=udp",
                                "turn:turn.cloudflare.com:53?transport=udp",
                                "turns:turn.cloudflare.com:443?transport=tcp"),
                        "username", "u", "credential", "c"));

        List<Map<String, Object>> out = CloudflareTurnClient.sanitize(response);

        assertEquals(2, out.size());
        assertEquals(List.of("stun:stun.cloudflare.com:3478"), out.get(0).get("urls"));
        assertEquals(List.of("turn:turn.cloudflare.com:3478?transport=udp", "turns:turn.cloudflare.com:443?transport=tcp"),
                out.get(1).get("urls"));
        assertEquals("u", out.get(1).get("username"));
        assertEquals("c", out.get(1).get("credential"));
    }

    @Test
    void handlesSingleStringUrlAndGarbage() {
        List<Map<String, Object>> out = CloudflareTurnClient.sanitize(List.of(
                Map.of("urls", "turn:turn.cloudflare.com:80?transport=tcp"),
                Map.of("urls", "turn:turn.cloudflare.com:53"),
                "not a map"));
        assertEquals(1, out.size());
        assertEquals(List.of("turn:turn.cloudflare.com:80?transport=tcp"), out.get(0).get("urls"));
        assertTrue(CloudflareTurnClient.sanitize(null).isEmpty());
    }

    @Test
    void port53Detection() {
        assertTrue(CloudflareTurnClient.usesPort53("turn:turn.cloudflare.com:53?transport=udp"));
        assertTrue(CloudflareTurnClient.usesPort53("stun:stun.cloudflare.com:53"));
        assertEquals(false, CloudflareTurnClient.usesPort53("turn:turn.cloudflare.com:5349?transport=tcp"));
        assertEquals(false, CloudflareTurnClient.usesPort53("turns:turn.cloudflare.com:443?transport=tcp"));
    }
}
