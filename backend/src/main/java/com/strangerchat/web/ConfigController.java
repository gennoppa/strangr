package com.strangerchat.web;

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

    public ConfigController(AppProperties props) {
        this.props = props;
    }

    @GetMapping("/config")
    public Map<String, Object> config() {
        List<Map<String, Object>> ice = props.iceServers().stream().map(s -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("urls", s.urls());
            if (s.username() != null) m.put("username", s.username());
            if (s.credential() != null) m.put("credential", s.credential());
            return m;
        }).toList();
        return Map.of("iceServers", ice);
    }
}
