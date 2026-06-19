package com.tcc.wazuhdashboard.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "wazuh")
public class WazuhProperties {

    @NotBlank
    private String indexerUrl;

    @NotBlank
    private String username;

    @NotBlank
    private String password;

    @NotBlank
    private String alertIndex;

    private boolean ignoreSsl;

    public String getIndexerUrl() {
        return indexerUrl;
    }

    public void setIndexerUrl(String indexerUrl) {
        this.indexerUrl = removeTrailingSlash(indexerUrl);
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getAlertIndex() {
        return alertIndex;
    }

    public void setAlertIndex(String alertIndex) {
        this.alertIndex = alertIndex;
    }

    public boolean isIgnoreSsl() {
        return ignoreSsl;
    }

    public void setIgnoreSsl(boolean ignoreSsl) {
        this.ignoreSsl = ignoreSsl;
    }

    private String removeTrailingSlash(String value) {
        if (value == null) {
            return null;
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
