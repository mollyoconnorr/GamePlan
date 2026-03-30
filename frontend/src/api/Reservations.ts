import type {RawAdminReservation} from "../types.ts";

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

// Fetch all reservations for the current user
export async function getReservations() {
    const res = await fetch("/api/reservations", {
        method: "GET",
        credentials: "include",
    });

    if (!res.ok) {
        throw new Error("Failed to fetch reservations");
    }

    return res.json();
}

export async function getActiveReservationsForAdmin() {
    const res = await fetch("/api/reservations/admin", {
        method: "GET",
        credentials: "include",
    });

    if (!res.ok) {
        throw new Error("Failed to fetch admin reservations");
    }

    return res.json() as Promise<RawAdminReservation[]>;
}

export async function deleteReservation(id: number) {
    const res = await fetch(`/api/reservations/${id}`, {
        method: "DELETE",
        credentials: "include",
    });

    if (!res.ok) {
        throw new Error("Failed to delete reservation");
    }
}

interface UpdateReservationRequest {
    start: string;
    end: string;
}

export async function updateReservation(id: number, request: UpdateReservationRequest) {
    const res = await fetch(`/api/reservations/${id}`, {
        method: "PUT",
        credentials: "include",
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

export async function getEquipmentReservations(id: number) {
    const res = await fetch(`/api/reservations/${id}`, {
        method: "GET",
        credentials: "include",
    });

    if (!res.ok) {
        throw new Error("Failed to fetch equipment reservations");
    }

    return res.json();
}

interface MakeReservationRequest {
    equipmentId: number;
    start: string;
    end: string;
}

export async function makeReservation(request: MakeReservationRequest) {
    const res = await fetch("/api/reservations", {
        method: "POST",
        credentials: "include",
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
