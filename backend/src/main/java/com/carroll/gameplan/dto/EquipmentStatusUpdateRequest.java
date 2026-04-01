package com.carroll.gameplan.dto;

/**
 * Payload used for updating the status of an equipment item.
 */
public class EquipmentStatusUpdateRequest {

    /**
     * New status label for the equipment.
     */
    private String status;

    public EquipmentStatusUpdateRequest() {
    }

    /**
     * Gets the requested status.
     *
     * @return status label
     */
    public String getStatus() {
        return status;
    }

    /**
     * Sets the requested status.
     *
     * @param status status label
     */
    public void setStatus(String status) {
        this.status = status;
    }
}
