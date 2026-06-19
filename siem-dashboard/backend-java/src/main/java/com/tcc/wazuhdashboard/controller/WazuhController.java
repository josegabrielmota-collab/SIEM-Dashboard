package com.tcc.wazuhdashboard.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.tcc.wazuhdashboard.dto.AlertListResponse;
import com.tcc.wazuhdashboard.dto.CountListResponse;
import com.tcc.wazuhdashboard.service.WazuhService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Validated
@RestController
@RequestMapping("/api")
public class WazuhController {

    private final WazuhService wazuhService;

    public WazuhController(WazuhService wazuhService) {
        this.wazuhService = wazuhService;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
                "ok", true,
                "message", "Backend do dashboard Wazuh está rodando"
        );
    }

    @GetMapping("/wazuh/status")
    public Map<String, Object> wazuhStatus() {
        JsonNode status = wazuhService.getIndexerStatus();
        return Map.of(
                "ok", true,
                "message", "Conexão com o Wazuh Indexer realizada com sucesso",
                "data", status
        );
    }

    @GetMapping("/alerts")
    public AlertListResponse alerts(
            @RequestParam(defaultValue = "24") @Min(1) @Max(720) int lastHours,
            @RequestParam(defaultValue = "0") @Min(0) @Max(16) int minLevel,
            @RequestParam(defaultValue = "50") @Min(1) @Max(500) int size
    ) {
        return wazuhService.getRecentAlerts(lastHours, minLevel, size);
    }

    @GetMapping("/alerts/severity")
    public CountListResponse alertsBySeverity(
            @RequestParam(defaultValue = "24") @Min(1) @Max(720) int lastHours
    ) {
        return wazuhService.getAlertsBySeverity(lastHours);
    }

    @GetMapping("/alerts/top-rules")
    public CountListResponse topRules(
            @RequestParam(defaultValue = "24") @Min(1) @Max(720) int lastHours
    ) {
        return wazuhService.getTopRules(lastHours);
    }

    @GetMapping("/alerts/agents")
    public CountListResponse alertsByAgent(
            @RequestParam(defaultValue = "24") @Min(1) @Max(720) int lastHours
    ) {
        return wazuhService.getAlertsByAgent(lastHours);
    }

    @GetMapping("/alerts/source-ips")
    public CountListResponse topSourceIps(
            @RequestParam(defaultValue = "24") @Min(1) @Max(720) int lastHours
    ) {
        return wazuhService.getTopSourceIps(lastHours);
    }
}
