package com.strangerchat.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.strangerchat.core.MatchmakingService;
import com.strangerchat.core.ModerationService;

/** Wires the framework-free core services as Spring beans. */
@Configuration
public class CoreConfig {

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    ModerationService moderationService(Clock clock, AppProperties props) {
        AppProperties.Moderation m = props.moderation();
        return new ModerationService(clock, m.reportThreshold(), m.reportWindow(), m.banDuration());
    }

    @Bean
    MatchmakingService matchmakingService(Clock clock, AppProperties props, ModerationService moderation) {
        return new MatchmakingService(clock, props.matching().interestWait(), props.matching().moodWait(), moderation);
    }
}
