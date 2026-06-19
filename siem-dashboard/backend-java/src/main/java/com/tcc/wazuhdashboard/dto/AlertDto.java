package com.tcc.wazuhdashboard.dto;

import java.util.List;

public record AlertDto(
        String id,
        String timestamp,
        Integer level,
        String description,
        List<String> groups,
        String agentName,
        String agentIp,
        String managerName,
        String location,
        String srcIp,
        String dstIp,
        List<String> mitreTactic,
        List<String> mitreTechnique,
        String fullLog
) {
}
