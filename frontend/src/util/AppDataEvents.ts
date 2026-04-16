export const APP_DATA_CHANGED_EVENT = "gameplan:data-changed";
export const RESERVATION_DATA_CHANGED_EVENT = "gameplan:reservation-data-changed";

export type AppDataChangedDetail = {
    kind: "users";
};

export type ReservationDataChangedDetail = {
    action: "created" | "canceled";
};

/**
 * Broadcasts non-reservation admin data changes (currently user list mutations).
 */
export function dispatchAppDataChanged(kind: AppDataChangedDetail["kind"]) {
    if (typeof window === "undefined") {
        return;
    }

    window.dispatchEvent(new CustomEvent<AppDataChangedDetail>(APP_DATA_CHANGED_EVENT, {
        detail: { kind },
    }));
}

/**
 * Broadcasts reservation lifecycle changes so other pages can refresh in-place.
 */
export function dispatchReservationDataChanged(action: ReservationDataChangedDetail["action"]) {
    if (typeof window === "undefined") {
        return;
    }

    window.dispatchEvent(new CustomEvent<ReservationDataChangedDetail>(RESERVATION_DATA_CHANGED_EVENT, {
        detail: { action },
    }));
}
