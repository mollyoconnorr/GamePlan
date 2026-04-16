import { describe, expect, it, vi } from "vitest";
import {
    APP_DATA_CHANGED_EVENT,
    RESERVATION_DATA_CHANGED_EVENT,
    dispatchAppDataChanged,
    dispatchReservationDataChanged,
} from "../../../src/util/AppDataEvents.ts";

describe("AppDataEvents", () => {
    it("dispatches app-data-changed events with kind detail", () => {
        const handler = vi.fn();
        window.addEventListener(APP_DATA_CHANGED_EVENT, handler);

        dispatchAppDataChanged("users");

        expect(handler).toHaveBeenCalledTimes(1);
        const event = handler.mock.calls[0][0] as CustomEvent<{ kind: "users" }>;
        expect(event.detail).toEqual({ kind: "users" });
        window.removeEventListener(APP_DATA_CHANGED_EVENT, handler);
    });

    it("dispatches reservation-data-changed events with action detail", () => {
        const handler = vi.fn();
        window.addEventListener(RESERVATION_DATA_CHANGED_EVENT, handler);

        dispatchReservationDataChanged("created");
        dispatchReservationDataChanged("canceled");

        expect(handler).toHaveBeenCalledTimes(2);
        const first = handler.mock.calls[0][0] as CustomEvent<{ action: "created" | "canceled" }>;
        const second = handler.mock.calls[1][0] as CustomEvent<{ action: "created" | "canceled" }>;
        expect(first.detail).toEqual({ action: "created" });
        expect(second.detail).toEqual({ action: "canceled" });
        window.removeEventListener(RESERVATION_DATA_CHANGED_EVENT, handler);
    });
});
