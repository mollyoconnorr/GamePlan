// Ensures hour/minute values render as HH:mm.
import type {ParsedTime} from "../types.ts";

export const formatTwoDigits = (value: number) => value.toString().padStart(2, "0");

// Accept only complete integer strings (no decimals and no partial parse).
export const parseWholeNumber = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed || !/^-?\d+$/.test(trimmed)) {
        return null;
    }
    return Number(trimmed);
};

// Parse strict 24-hour HH:mm format and include total minutes for comparisons.
export const parseTime = (raw: string): ParsedTime | null => {
    if (!/^\d{2}:\d{2}$/.test(raw)) {
        return null;
    }

    const [hour, minute] = raw.split(":").map(Number);
    if (
        Number.isNaN(hour) ||
        Number.isNaN(minute) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
    ) {
        return null;
    }

    return {
        hour,
        minute,
        totalMinutes: hour * 60 + minute,
    };
};