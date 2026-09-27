package com.strangerchat.ws;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.strangerchat.core.MatchmakingService;
import com.strangerchat.core.ModerationService;

/** Retries matching every second so interest-only waiters fall back to random strangers. */
@Component
public class MatchmakingScheduler {

    private final MatchmakingService matchmaking;
    private final ModerationService moderation;

    public MatchmakingScheduler(MatchmakingService matchmaking, ModerationService moderation) {
        this.matchmaking = matchmaking;
        this.moderation = moderation;
    }

    @Scheduled(fixedDelay = 1000)
    public void tick() {
        matchmaking.tick();
    }

    @Scheduled(fixedDelay = 600_000)
    public void cleanup() {
        moderation.cleanup();
    }
}
