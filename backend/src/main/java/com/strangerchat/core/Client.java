package com.strangerchat.core;

import java.time.Instant;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * One connected browser tab. All mutable state is guarded by the {@link MatchmakingService} lock.
 */
public final class Client {

    public enum State { IDLE, WAITING, CHATTING }

    private final String id;
    private final String ip;
    private final MessageSender sender;

    private State state = State.IDLE;
    private Set<String> interests = Collections.emptySet();
    private Mood mood = Mood.ANY;
    private Instant waitingSince;
    private Client partner;
    private String lastPartnerId;

    /** Client ids and IPs this user never wants to be matched with again (this session). */
    private final Set<String> blockedIds = new HashSet<>();
    private final Set<String> blockedIps = new HashSet<>();

    public Client(String id, String ip, MessageSender sender) {
        this.id = id;
        this.ip = ip;
        this.sender = sender;
    }

    public String id() { return id; }
    public String ip() { return ip; }
    public MessageSender sender() { return sender; }

    State state() { return state; }
    void state(State state) { this.state = state; }

    Set<String> interests() { return interests; }
    void interests(Set<String> interests) { this.interests = Collections.unmodifiableSet(new LinkedHashSet<>(interests)); }

    Mood mood() { return mood; }
    void mood(Mood mood) { this.mood = mood == null ? Mood.ANY : mood; }

    Instant waitingSince() { return waitingSince; }
    void waitingSince(Instant t) { this.waitingSince = t; }

    Client partner() { return partner; }
    void partner(Client partner) { this.partner = partner; }

    String lastPartnerId() { return lastPartnerId; }
    void lastPartnerId(String id) { this.lastPartnerId = id; }

    void block(Client other) {
        blockedIds.add(other.id);
        // Only block by IP when it differs from ours; otherwise users behind the same NAT
        // (or two tabs during local testing) would block themselves out of the pool.
        if (other.ip != null && !other.ip.equals(this.ip)) {
            blockedIps.add(other.ip);
        }
    }

    boolean hasBlocked(Client other) {
        return blockedIds.contains(other.id) || (other.ip != null && blockedIps.contains(other.ip));
    }

    void send(java.util.Map<String, Object> msg) {
        sender.send(msg);
    }
}
