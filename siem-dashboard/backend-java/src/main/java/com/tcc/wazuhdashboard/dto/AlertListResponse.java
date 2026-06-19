package com.tcc.wazuhdashboard.dto;

import java.util.List;

public record AlertListResponse(
        boolean ok,
        long total,
        List<AlertDto> alerts
) {
}
