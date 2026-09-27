package com.strangerchat.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * The React app handles these paths itself; the server just serves index.html for them
 * so links like hellostrangr.com/terms work when opened directly.
 */
@Configuration
public class SpaRoutesConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/terms").setViewName("forward:/index.html");
        registry.addViewController("/privacy").setViewName("forward:/index.html");
    }
}
