package com.strangerchat.web;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.strangerchat.config.AppProperties;

/** Client bootstrap config: ICE (STUN/TURN) servers for RTCPeerConnection. */
@RestController
@RequestMapping("/api")
public class ConfigController {

    private final AppProperties props;
    private final MeteredTurnClient metered;

    public ConfigController(AppProperties props, MeteredTurnClient metered) {
        this.props = props;
        this.metered = metered;
    }

    @GetMapping("/config")
    public Map<String, Object> config() {
        List<Map<String, Object>> ice = new ArrayList<>();
        for (AppProperties.IceServer s : props.iceServers()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("urls", s.urls());
            if (s.username() != null) m.put("username", s.username());
            if (s.credential() != null) m.put("credential", s.credential());
            ice.add(m);
        }
        // TURN relay (if configured) so video works across strict networks / mobile data.
        ice.addAll(metered.iceServers());
        return Map.of("iceServers", ice);
    }
}
