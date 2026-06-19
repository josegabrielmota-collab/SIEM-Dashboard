package com.tcc.wazuhdashboard.dto;

import java.util.List;

public record CountListResponse(
        boolean ok,
        List<CountDto> data
) {
}
