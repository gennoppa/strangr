package com.strangerchat.core;

import java.util.Map;

/**
 * Transport abstraction so the matchmaking core stays framework-free and unit-testable.
 */
public interface MessageSender {

    /** Send a JSON-serialisable message to the client. Must never throw. */
    void send(Map<String, Object> message);

    /** Close the underlying connection (e.g. after a ban). Must never throw. */
    void close();
}
