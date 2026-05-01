import type {RawAdminReservation, RawReservation} from "../types.ts";
import {apiFetch} from "./apiFetch.ts";

/**
 * Tries to surface backend-provided error details from JSON or plain-text responses.
 */
async function extractErrorMessage(response: Response, fallback: string) {
    const body = await response.text();
    if (!body) {
        return fallback;
    }

    try {
        const data = JSON.parse(body);
        if (data?.message) {
            return data.message;
        }
    } catch {
        // not JSON, ignore
    }

    return body.trim();
}

/**
 * Fetches reservations belonging to the currently authenticated user.
 */
export async function getReservations() {
    const res = await apiFetch("/api/reservations", {
        method: "GET",
    });

    if (!res.ok) {
        throw new Error("Failed to fetch reservations");
    }

    return res.json();
}

/**
 * Fetches all active reservations visible to trainers and admins.
 */
export async function getActiveReservationsForAdmin() {
    const res = await apiFetch("/api/reservations/admin", {
        method: "GET",
    });

    if (!res.ok) {
        throw new Error("Failed to fetch admin reservations");
    }

    return res.json() as Promise<RawAdminReservation[]>;
}

/**
 * Sends the delete request for reservation after confirmation.
 */
export async function deleteReservation(id: number) {
    const res = await apiFetch(`/api/reservations/${id}`, {
        method: "DELETE",
    });

    if (!res.ok) {
        throw new Error("Failed to delete reservation");
    }
}

/**
 * Payload sent when changing an existing reservation time range.
 */
interface UpdateReservationRequest {
    start: string;
    end: string;
}

/**
 * Updates an existing reservation's time range.
 */
export async function updateReservation(id: number, request: UpdateReservationRequest) {
    const res = await apiFetch(`/api/reservations/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });

    if (!res.ok) {
        const message = await extractErrorMessage(res, "Failed to update reservation");
        throw new Error(message);
    }
}

/**
 * Fetches active reservations for a single equipment item.
 */
export async function getEquipmentReservations(id: number) {
    const res = await apiFetch(`/api/reservations/${id}`, {
        method: "GET",
    });

    if (!res.ok) {
        throw new Error("Failed to fetch equipment reservations");
    }

    return res.json() as Promise<RawReservation[]>;
}

/**
 * Payload sent when booking equipment for a selected date-time range.
 */
interface MakeReservationRequest {
    equipmentId: number;
    start: string;
    end: string;
}

/**
 * Creates a reservation for a specific equipment id and ISO date-time range.
 */
export async function makeReservation(request: MakeReservationRequest) {
    const res = await apiFetch("/api/reservations", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });

    if (!res.ok) {
        const message = await extractErrorMessage(res, "Failed to create reservation");
        throw new Error(message);
    }

    return res.json();
}
