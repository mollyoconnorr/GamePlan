import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createEquipment,
    createEquipmentType,
    deleteEquipment,
    getEquipment,
    getEquipmentTypeAttributeValues,
    getEquipmentTypeAttributes,
    getEquipmentTypes,
    updateEquipment,
    updateEquipmentStatus,
    updateEquipmentType,
} from "../../../src/api/Equipment.ts";

function response(ok: boolean, data?: unknown): Response {
    return {
        ok,
        json: vi.fn().mockResolvedValue(data),
    } as unknown as Response;
}

describe("Equipment API", () => {
    beforeEach(() => {
        vi.unstubAllGlobals();
    });

    it("gets equipment types", async () => {
        const payload = [{ id: 1, name: "Bike" }];
        const fetchMock = vi.fn().mockResolvedValue(response(true, payload));
        vi.stubGlobal("fetch", fetchMock);

        await expect(getEquipmentTypes()).resolves.toEqual(payload);
        expect(fetchMock).toHaveBeenCalledWith("/api/equipment-types", {
            method: "GET",
            credentials: "include",
        });
    });

    it("creates equipment type", async () => {
        const request = { name: "Rower", fieldSchema: "{}", color: "#111111" };
        const fetchMock = vi.fn().mockResolvedValue(response(true));
        vi.stubGlobal("fetch", fetchMock);

        await createEquipmentType(request);
        expect(fetchMock).toHaveBeenCalledWith("/api/equipment-types", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
        });
    });

    it("updates equipment type", async () => {
        const request = { name: "Updated", color: "#222222" };
        const payload = { id: 2, name: "Updated" };
        const fetchMock = vi.fn().mockResolvedValue(response(true, payload));
        vi.stubGlobal("fetch", fetchMock);

        await expect(updateEquipmentType(2, request)).resolves.toEqual(payload);
        expect(fetchMock).toHaveBeenCalledWith("/api/equipment-types/2", {
            method: "PUT",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
        });
    });

    it("gets equipment type attributes and attribute values", async () => {
        const payload = [{ name: "Size", options: ["S", "M"] }];
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(response(true, payload))
            .mockResolvedValueOnce(response(true, payload));
        vi.stubGlobal("fetch", fetchMock);

        await expect(getEquipmentTypeAttributes(3)).resolves.toEqual(payload);
        await expect(getEquipmentTypeAttributeValues(3)).resolves.toEqual(payload);
    });

    it("creates equipment", async () => {
        const request = { name: "Bike 1", equipmentTypeId: 1, attributes: { Size: "M" } };
        const fetchMock = vi.fn().mockResolvedValue(response(true));
        vi.stubGlobal("fetch", fetchMock);

        await createEquipment(request);
        expect(fetchMock).toHaveBeenCalledWith("/api/equipment", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
        });
    });

    it("gets and updates equipment", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(response(true, { id: 5, name: "Bike 5" }))
            .mockResolvedValueOnce(response(true))
            .mockResolvedValueOnce(response(true, { id: 5, name: "Bike Updated" }));
        vi.stubGlobal("fetch", fetchMock);

        await expect(getEquipment(5)).resolves.toEqual({ id: 5, name: "Bike 5" });
        await expect(
            updateEquipment(5, {
                name: "Bike Updated",
                equipmentTypeId: 1,
                attributes: { Size: "L" },
            }),
        ).resolves.toEqual({ id: 5, name: "Bike Updated" });
    });

    it("deletes equipment", async () => {
        const fetchMock = vi.fn().mockResolvedValue(response(true));
        vi.stubGlobal("fetch", fetchMock);

        await deleteEquipment(8);
        expect(fetchMock).toHaveBeenCalledWith("/api/equipment/8", {
            method: "DELETE",
            credentials: "include",
        });
    });

    it("updates equipment status", async () => {
        const payload = { equipment: { id: 9, name: "Bike" }, canceledReservations: 1 };
        const fetchMock = vi.fn().mockResolvedValue(response(true, payload));
        vi.stubGlobal("fetch", fetchMock);

        await expect(updateEquipmentStatus(9, "MAINTENANCE")).resolves.toEqual(payload);
        expect(fetchMock).toHaveBeenCalledWith("/api/equipment/9/status", {
            method: "PUT",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: "MAINTENANCE" }),
        });
    });

    it("throws expected errors when endpoints fail", async () => {
        const fetchMock = vi.fn().mockResolvedValue(response(false));
        vi.stubGlobal("fetch", fetchMock);

        await expect(getEquipmentTypes()).rejects.toThrow("Failed to fetch equipment types");
        await expect(createEquipmentType({ name: "x", fieldSchema: "{}", color: "#000" })).rejects.toThrow("Failed to create equipment type");
        await expect(updateEquipmentType(1, { name: "x" })).rejects.toThrow("Failed to update equipment type");
        await expect(getEquipmentTypeAttributes(1)).rejects.toThrow("Failed to fetch equipment type attributes");
        await expect(getEquipmentTypeAttributeValues(1)).rejects.toThrow("Failed to fetch equipment type attribute values");
        await expect(createEquipment({ name: "x", equipmentTypeId: 1, attributes: {} })).rejects.toThrow("Failed to create equipment");
        await expect(getEquipment(1)).rejects.toThrow("Failed to load equipment");
        await expect(updateEquipment(1, { name: "x", equipmentTypeId: 1, attributes: {} })).rejects.toThrow("Failed to update equipment");
        await expect(deleteEquipment(1)).rejects.toThrow("Failed to delete equipment");
        await expect(updateEquipmentStatus(1, "MAINTENANCE")).rejects.toThrow("Failed to update equipment status");
    });
});
