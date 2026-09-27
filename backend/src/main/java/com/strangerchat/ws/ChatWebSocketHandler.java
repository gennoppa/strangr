package com.strangerchat.ws;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.strangerchat.core.Client;
import com.strangerchat.core.MatchmakingService;
import com.strangerchat.core.MessageSender;
import com.strangerchat.core.Mood;

/**
 * JSON-over-WebSocket protocol.
 *
 * <pre>
 * client → server                         server → client
 *  {type:"join", interests:[..], mood}     {type:"hello", id}
 *  {type:"next"}                           {type:"waiting", interests}
 *  {type:"stop"}                           {type:"matched", initiator, commonInterests}
 *  {type:"signal", data:{sdp|candidate}}   {type:"signal", data}
 *  {type:"chat", text}                     {type:"chat", text}
 *  {type:"typing", typing:bool}            {type:"typing", typing}
 *  {type:"block"}                          {type:"partner_left"} / {type:"stopped"}
 *  {type:"report", reason}                 {type:"blocked"} / {type:"reported"}
 *  {type:"ping"}                           {type:"banned", until} / {type:"error", message} / {type:"pong"}
 * </pre>
 */
@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(ChatWebSocketHandler.class);

    /** Max chat/typing messages per client per window (simple spam guard). */
    private static final int RATE_LIMIT = 20;
    private static final long RATE_WINDOW_MS = 5_000;

    private final MatchmakingService matchmaking;
    private final ObjectMapper mapper;
    private final Map<String, RateWindow> rates = new ConcurrentHashMap<>();
    /** Thread-safe decorated sessions, keyed by raw session id. */
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    public ChatWebSocketHandler(MatchmakingService matchmaking, ObjectMapper mapper) {
        this.matchmaking = matchmaking;
        this.mapper = mapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession raw) {
        // Decorator makes sends thread-safe and buffers for slow clients (drops them if they fall too far behind).
        WebSocketSession session = new ConcurrentWebSocketSessionDecorator(raw, 10_000, 512 * 1024);
        sessions.put(raw.getId(), session);
        String ip = (String) raw.getAttributes().getOrDefault(ClientIpHandshakeInterceptor.IP_ATTR, "unknown");
        Client client = new Client(raw.getId(), ip, new SessionSender(session, mapper));
        matchmaking.connect(client);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String id = session.getId();
        JsonNode msg;
        try {
            msg = mapper.readTree(message.getPayload());
        } catch (IOException e) {
            return; // ignore malformed frames
        }
        if (msg == null || !msg.hasNonNull("type")) return;

        switch (msg.get("type").asText()) {
            case "join" -> matchmaking.join(id, readInterests(msg.get("interests")), Mood.parse(msg.path("mood").asText(null)));
            case "next" -> matchmaking.next(id);
            case "stop" -> matchmaking.stop(id);
            case "signal" -> matchmaking.signal(id, msg.get("data"));
            case "chat" -> {
                if (allow(id)) matchmaking.chat(id, msg.path("text").asText(""));
            }
            case "typing" -> {
                if (allow(id)) matchmaking.typing(id, msg.path("typing").asBoolean(false));
            }
            case "block" -> matchmaking.block(id);
            case "report" -> {
                String reason = msg.path("reason").asText("unspecified");
                log.info("Report from session {}: {}", id, reason.length() > 100 ? reason.substring(0, 100) : reason);
                matchmaking.report(id, reason);
            }
            case "ping" -> pong(id);
            default -> { /* unknown type: ignore */ }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        rates.remove(session.getId());
        sessions.remove(session.getId());
        matchmaking.disconnect(session.getId());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.debug("Transport error on {}: {}", session.getId(), exception.getMessage());
    }

    private static List<String> readInterests(JsonNode node) {
        List<String> list = new ArrayList<>();
        if (node != null && node.isArray()) {
            node.forEach(n -> { if (n.isTextual()) list.add(n.asText()); });
        }
        return list;
    }

    private boolean allow(String id) {
        return rates.computeIfAbsent(id, k -> new RateWindow()).tryAcquire();
    }

    private void pong(String id) {
        WebSocketSession session = sessions.get(id);
        if (session == null || !session.isOpen()) return;
        try {
            session.sendMessage(new TextMessage("{\"type\":\"pong\"}"));
        } catch (IOException | IllegalStateException ignored) {
            // client went away
        }
    }

    private static final class RateWindow {
        private long windowStart = System.currentTimeMillis();
        private int count;

        synchronized boolean tryAcquire() {
            long now = System.currentTimeMillis();
            if (now - windowStart > RATE_WINDOW_MS) {
                windowStart = now;
                count = 0;
            }
            return ++count <= RATE_LIMIT;
        }
    }

    /** Adapts a WebSocket session to the core's {@link MessageSender}. */
    private record SessionSender(WebSocketSession session, ObjectMapper mapper) implements MessageSender {

        @Override
        public void send(Map<String, Object> message) {
            if (!session.isOpen()) return;
            try {
                session.sendMessage(new TextMessage(mapper.writeValueAsString(message)));
            } catch (Exception e) {
                log.debug("Send failed to {}: {}", session.getId(), e.getMessage());
            }
        }

        @Override
        public void close() {
            try {
                session.close(CloseStatus.POLICY_VIOLATION);
            } catch (Exception ignored) {
                // already closed
            }
        }
    }
}
