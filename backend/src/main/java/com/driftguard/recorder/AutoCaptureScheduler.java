package com.driftguard.recorder;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class AutoCaptureScheduler {

    private static final Logger log = LoggerFactory.getLogger(AutoCaptureScheduler.class);

    @Scheduled(cron = "0 0 * * * *")
    public void openCaptureWindow() {
        log.info("auto-capture window open");
    }
}
