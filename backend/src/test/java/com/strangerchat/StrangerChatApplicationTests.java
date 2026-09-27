package com.strangerchat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Boots the real server on a random port. (WebSocket config needs a real servlet container,
 * so the default MOCK web environment can't be used.)
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class StrangerChatApplicationTests {

    @LocalServerPort
    int port;

    @Autowired
    ObjectMapper mapper;

    @Test
    void contextLoads() {
        // all beans (WebSocket config, properties, core services) wire up
    }

    @Test
    void twoClientsAreMatchedAndCanChat() throws Exception {
        TestClient a = new TestClient();
        TestClient b = new TestClient();
        try {
            assertEquals("hello", a.next().get("type").asText());
            assertEquals("hello", b.next().get("type").asText());

            a.send("{\"type\":\"join\",\"interests\":[]}");
            assertEquals("waiting", a.next().get("type").asText());

            b.send("{\"type\":\"join\",\"interests\":[]}");
            JsonNode matchedA = a.next();
            JsonNode matchedB = b.next();
            assertEquals("matched", matchedA.get("type").asText());
            assertEquals("matched", matchedB.get("type").asText());
            assertEquals(true, matchedA.get("initiator").asBoolean());
            assertEquals(false, matchedB.get("initiator").asBoolean());

            a.send("{\"type\":\"chat\",\"text\":\"hi there\"}");
            JsonNode chat = b.next();
            assertEquals("chat", chat.get("type").asText());
            assertEquals("hi there", chat.get("text").asText());

            b.send("{\"type\":\"signal\",\"data\":{\"sdp\":{\"type\":\"answer\",\"sdp\":\"x\"}}}");
            JsonNode signal = a.next();
            assertEquals("signal", signal.get("type").asText());
            assertEquals("answer", signal.at("/data/sdp/type").asText());

            a.send("{\"type\":\"next\"}");
            assertEquals("partner_left", b.next().get("type").asText());
        } finally {
            a.close();
            b.close();
        }
    }

    /** Minimal JDK WebSocket client that queues incoming JSON messages. */
    private final class TestClient implements WebSocket.Listener {
        private final BlockingQueue<String> inbox = new LinkedBlockingQueue<>();
        private final StringBuilder partial = new StringBuilder();
        private final WebSocket ws;

        TestClient() {
            ws = HttpClient.newHttpClient().newWebSocketBuilder()
                    .buildAsync(URI.create("ws://localhost:" + port + "/ws"), this)
                    .join();
        }

        @Override
        public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
            partial.append(data);
            if (last) {
                inbox.add(partial.toString());
                partial.setLength(0);
            }
            webSocket.request(1);
            return null;
        }

        JsonNode next() throws Exception {
            String msg = inbox.poll(5, TimeUnit.SECONDS);
            assertNotNull(msg, "timed out waiting for a server message");
            return mapper.readTree(msg);
        }

        void send(String json) {
            ws.sendText(json, true).join();
        }

        void close() {
            ws.sendClose(WebSocket.NORMAL_CLOSURE, "bye");
        }
    }
}
