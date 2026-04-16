import { describe, expect, it } from "vitest";
import { getFriendlyReservationErrorMessage } from "../../../src/util/ReservationErrorMessages.ts";

describe("ReservationErrorMessages", () => {
    it("returns a fallback message for empty input", () => {
        expect(getFriendlyReservationErrorMessage("")).toBe(
            "Something went wrong while updating the reservation.",
        );
    });

    it("maps known backend conflict messages to user-friendly copy", () => {
        expect(getFriendlyReservationErrorMessage("You already have another reservation in this time range"))
            .toContain("overlaps with one of your other reservations");
        expect(getFriendlyReservationErrorMessage("equipment is already reserved for requested time"))
            .toContain("already has that equipment booked");
        expect(getFriendlyReservationErrorMessage("conflicts with existing reservations"))
            .toContain("already has that equipment booked");
        expect(getFriendlyReservationErrorMessage("end time must be after start time"))
            .toBe("The end time must be after the start time.");
    });

    it("maps schedule-block related backend messages", () => {
        expect(getFriendlyReservationErrorMessage("weekend reservations are not allowed"))
            .toBe("Weekends are blocked off. Please choose a weekday.");
        expect(getFriendlyReservationErrorMessage("blocked by an admin"))
            .toBe("This time is blocked off by a trainer or admin. Choose a different time.");
        expect(getFriendlyReservationErrorMessage("weekend reservations are disabled"))
            .toBe("Weekend reservations are disabled. Choose a weekday.");
    });

    it("returns the original message when no mapping exists", () => {
        expect(getFriendlyReservationErrorMessage("Custom API message"))
            .toBe("Custom API message");
    });
});
