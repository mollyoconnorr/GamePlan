export function getFriendlyReservationErrorMessage(rawMessage: string) {
    if (!rawMessage) {
        return "Something went wrong while updating the reservation.";
    }

    const normalized = rawMessage.toLowerCase();

    if (normalized.includes("already have another reservation")) {
        return "This time overlaps with one of your other reservations. Delete or adjust that reservation before saving.";
    }

    if (normalized.includes("equipment is already reserved")
        || normalized.includes("conflicts with existing reservations")) {
        return "Someone else already has that equipment booked during the selected time. Consider deleting this reservation and recreating it or choose a different slot.";
    }

    if (normalized.includes("end time must be after start time")) {
        return "The end time must be after the start time.";
    }

    // Surface backend schedule-block validation in user-friendly terms.
    if (normalized.includes("weekend reservations are not allowed")) {
        return "Weekends are blocked off. Please choose a weekday.";
    }

    if (normalized.includes("blocked by an admin")) {
        return "This time is blocked off by an athletic trainer or admin. Choose a different time.";
    }

    if (normalized.includes("weekend reservations are disabled")) {
        return "Weekend reservations are disabled. Choose a weekday.";
    }

    return rawMessage;
}
