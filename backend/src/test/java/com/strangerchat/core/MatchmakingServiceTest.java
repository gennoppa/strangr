package com.strangerchat.core;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MatchmakingServiceTest {

    /** Mutable clock for simulating waits. */
    static final class TestClock extends Clock {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
        void advance(Duration d) { now = now.plus(d); }
    }

    static final class Recorder implements MessageSender {
        final List<Map<String, Object>> messages = new ArrayList<>();
        boolean closed;
        @Override public void send(Map<String, Object> m) { messages.add(m); }
        @Override public void close() { closed = true; }
        Map<String, Object> last() { return messages.get(messages.size() - 1); }
        String lastType() { return (String) last().get("type"); }
    }

    TestClock clock;
    ModerationService moderation;
    MatchmakingService mm;

    @BeforeEach
    void setUp() {
        clock = new TestClock();
        moderation = new ModerationService(clock, 2, Duration.ofHours(1), Duration.ofHours(24));
        mm = new MatchmakingService(clock, Duration.ofSeconds(8), moderation);
    }

    Recorder connect(String id, String ip) {
        Recorder r = new Recorder();
        mm.connect(new Client(id, ip, r));
        return r;
    }

    @Test
    void randomUsersArePaired() {
        Recorder a = connect("a", "1.1.1.1");
        Recorder b = connect("b", "2.2.2.2");
        mm.join("a", List.of());
        assertEquals("waiting", a.lastType());
        mm.join("b", List.of());
        assertEquals("matched", a.lastType());
        assertEquals("matched", b.lastType());
        assertEquals(true, a.last().get("initiator"));
        assertEquals(false, b.last().get("initiator"));
    }

    @Test
    void chatAndSignalAreRelayed() {
        Recorder a = connect("a", "1.1.1.1");
        Recorder b = connect("b", "2.2.2.2");
        mm.join("a", List.of());
        mm.join("b", List.of());
        mm.chat("a", "  hello  ");
        assertEquals(Map.of("type", "chat", "text", "hello"), b.last());
        mm.signal("b", Map.of("sdp", "x"));
        assertEquals("signal", a.lastType());
    }

    @Test
    void interestsPreferredThenFallbackToRandom() {
        Recorder a = connect("a", "1.1.1.1");
        Recorder b = connect("b", "2.2.2.2");
        Recorder c = connect("c", "3.3.3.3");
        mm.join("a", List.of("Music"));
        mm.join("b", List.of("sports"));   // no overlap -> both keep waiting
        assertEquals("waiting", b.lastType());
        mm.join("c", List.of("  music "));  // overlaps with a
        assertEquals("matched", c.lastType());
        assertEquals(List.of("music"), c.last().get("commonInterests"));
        assertEquals("matched", a.lastType());

        // b is alone; after the wait window a newcomer without interests can match b
        Recorder d = connect("d", "4.4.4.4");
        mm.join("d", List.of());
        assertEquals("waiting", d.lastType());
        clock.advance(Duration.ofSeconds(9));
        mm.tick();
        assertEquals("matched", b.lastType());
        assertEquals("matched", d.lastType());
    }

    @Test
    void nextNotifiesPartnerAndAvoidsImmediateRematch() {
        Recorder a = connect("a", "1.1.1.1");
        Recorder b = connect("b", "2.2.2.2");
        mm.join("a", List.of());
        mm.join("b", List.of());
        mm.next("a");
        assertEquals("partner_left", b.lastType());
        assertEquals("waiting", a.lastType());
        mm.next("b");
        assertEquals("waiting", b.lastType()); // not instantly re-paired
        clock.advance(Duration.ofSeconds(9));
        mm.tick();
        assertEquals("matched", a.lastType()); // but eventually, if they're the only two
    }

    @Test
    void blockedUsersNeverMatchAgain() {
        Recorder a = connect("a", "1.1.1.1");
        Recorder b = connect("b", "2.2.2.2");
        mm.join("a", List.of());
        mm.join("b", List.of());
        mm.block("a");
        assertEquals("partner_left", b.lastType());
        mm.next("a");
        mm.next("b");
        clock.advance(Duration.ofMinutes(5));
        mm.tick();
        assertEquals("waiting", a.lastType());
        assertEquals("waiting", b.lastType());
    }

    @Test
    void enoughDistinctReportsBanTheIp() {
        Recorder bad = connect("bad", "6.6.6.6");
        Recorder r1 = connect("r1", "1.1.1.1");
        Recorder r2 = connect("r2", "2.2.2.2");

        mm.join("bad", List.of());
        mm.join("r1", List.of());
        mm.report("r1", "nudity");
        assertEquals("partner_left", bad.lastType());

        mm.next("bad");
        mm.join("r2", List.of());
        mm.report("r2", "abuse");
        assertEquals("banned", bad.lastType());
        assertTrue(bad.closed);

        // reconnecting from the same IP is refused
        Recorder again = connect("bad2", "6.6.6.6");
        assertEquals("banned", again.lastType());
        assertTrue(again.closed);
    }

    @Test
    void sameIpReportsAreIgnored() {
        connect("a", "1.1.1.1");
        Recorder b = connect("b", "1.1.1.1");
        mm.join("a", List.of());
        mm.join("b", List.of());
        mm.report("a", "x");
        assertTrue(!b.closed);
    }

    @Test
    void disconnectNotifiesPartner() {
        connect("a", "1.1.1.1");
        Recorder b = connect("b", "2.2.2.2");
        mm.join("a", List.of());
        mm.join("b", List.of());
        mm.disconnect("a");
        assertEquals("partner_left", b.lastType());
    }
}
