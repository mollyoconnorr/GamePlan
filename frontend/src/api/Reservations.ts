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