package com.tcc.wazuhdashboard.exception;

public class WazuhApiException extends RuntimeException {

    public WazuhApiException(String message) {
        super(message);
    }

    public WazuhApiException(String message, Throwable cause) {
        super(message, cause);
    }
}
