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
        throw new Error("Failed to update reservation");
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
        throw new Error("Failed to create reservation");
    }

    return res.json();
}
