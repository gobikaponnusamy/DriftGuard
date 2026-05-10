package com.driftguard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableAsync
@EnableScheduling
@SpringBootApplication
public class DriftGuardApplication {

    public static void main(String[] args) {
        SpringApplication.run(DriftGuardApplication.class, args);
    }
}
