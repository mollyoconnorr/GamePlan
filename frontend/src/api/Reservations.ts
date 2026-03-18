// src/api/Reservations.ts

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

    console.log(`Reservation ${id} deleted`);
}