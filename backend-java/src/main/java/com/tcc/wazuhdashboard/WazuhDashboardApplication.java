package com.tcc.wazuhdashboard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class WazuhDashboardApplication {

    public static void main(String[] args) {
        SpringApplication.run(WazuhDashboardApplication.class, args);
    }
}
