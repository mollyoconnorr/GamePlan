import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    deleteReservation,
    getEquipmentReservations,
    getReservations,
    makeReservation,
    updateReservation,
} from "../../../src/api/Reservations.ts";

function response<T>(ok: boolean, data?: T): Response {
    return {
        ok,
        json: vi.fn().mockResolvedValue(data),
    } as unknown as Response;
}

describe("Reservations API", () => {
    beforeEach(() => {
        // Keep global fetch stubs isolated per test
        vi.unstubAllGlobals();
    });

    it("fetches user reservations", async () => {
        // Success path returns parsed json payload
        const data = [{ id: 1, equipmentName: "Ice Bath" }];
        const fetchMock = vi.fn().mockResolvedValue(response(true, data));
        vi.stubGlobal("fetch", fetchMock);

        await expect(getReservations()).resolves.toEqual(data);
        expect(fetchMock).toHaveBeenCalledWith("/api/reservations", {
            method: "GET",
            credentials: "include",
        });
    });

    it("throws when fetching user reservations fails", async () => {
        // Non ok response should surface a clear error
        const fetchMock = vi.fn().mockResolvedValue(response(false));
        vi.stubGlobal("fetch", fetchMock);

        await expect(getReservations()).rejects.toThrow("Failed to fetch reservations");
    });

    it("deletes a reservation", async () => {
        // Delete uses the reservation id in the url
        const fetchMock = vi.fn().mockResolvedValue(response(true));
        vi.stubGlobal("fetch", fetchMock);

        await deleteReservation(42);

        expect(fetchMock).toHaveBeenCalledWith("/api/reservations/42", {
            method: "DELETE",
            credentials: "include",
        });
    });

    it("throws when deleting a reservation fails", async () => {
        const fetchMock = vi.fn().mockResolvedValue(response(false));
        vi.stubGlobal("fetch", fetchMock);

        await expect(deleteReservation(42)).rejects.toThrow("Failed to delete reservation");
    });

    it("updates a reservation", async () => {
        // Update should send a json body with start and end
        const fetchMock = vi.fn().mockResolvedValue(response(true));
        vi.stubGlobal("fetch", fetchMock);
        const request = {
            start: "2026-03-20T10:00:00",
            end: "2026-03-20T11:00:00",
        };

        await updateReservation(5, request);

        expect(fetchMock).toHaveBeenCalledWith("/api/reservations/5", {
            method: "PUT",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
        });
    });

    it("throws when updating a reservation fails", async () => {
        const fetchMock = vi.fn().mockResolvedValue(response(false));
        vi.stubGlobal("fetch", fetchMock);

        await expect(
            updateReservation(5, {
                start: "2026-03-20T10:00:00",
                end: "2026-03-20T11:00:00",
            }),
        ).rejects.toThrow("Failed to update reservation");
    });

    it("fetches reservations for one piece of equipment", async () => {
        const data = [{ id: 2, equipmentName: "Ice Bath" }];
        const fetchMock = vi.fn().mockResolvedValue(response(true, data));
        vi.stubGlobal("fetch", fetchMock);

        await expect(getEquipmentReservations(9)).resolves.toEqual(data);
        expect(fetchMock).toHaveBeenCalledWith("/api/reservations/9", {
            method: "GET",
            credentials: "include",
        });
    });

    it("throws when fetching equipment reservations fails", async () => {
        const fetchMock = vi.fn().mockResolvedValue(response(false));
        vi.stubGlobal("fetch", fetchMock);

        await expect(getEquipmentReservations(9)).rejects.toThrow("Failed to fetch equipment reservations");
    });

    it("creates a reservation", async () => {
        // Create returns the new reservation payload
        const data = { id: 8 };
        const request = {
            equipmentId: 3,
            start: "2026-03-21T07:00:00",
            end: "2026-03-21T08:00:00",
        };
        const fetchMock = vi.fn().mockResolvedValue(response(true, data));
        vi.stubGlobal("fetch", fetchMock);

        await expect(makeReservation(request)).resolves.toEqual(data);
        expect(fetchMock).toHaveBeenCalledWith("/api/reservations", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
        });
    });

    it("throws when creating a reservation fails", async () => {
        const fetchMock = vi.fn().mockResolvedValue(response(false));
        vi.stubGlobal("fetch", fetchMock);

        await expect(
            makeReservation({
                equipmentId: 3,
                start: "2026-03-21T07:00:00",
                end: "2026-03-21T08:00:00",
            }),
        ).rejects.toThrow("Failed to create reservation");
    });
});
