package com.carroll.gameplan.dto.request;

/**
 * Payload used for updating the status of an equipment item.
 */
public class EquipmentStatusUpdateRequest {

    private String status;

    public EquipmentStatusUpdateRequest() {
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
