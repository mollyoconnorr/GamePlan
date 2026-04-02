import dayjs from "dayjs";
import type {CalendarEvent, RawScheduleBlock} from "../types.ts";

// Keep block events chronologically ordered so Calendar rendering is deterministic.
export function sortEventsByStartIso(events: CalendarEvent[]) {
    return [...events].sort((a, b) => {
        const aStart = a.startIso ? dayjs(a.startIso).valueOf() : 0;
        const bStart = b.startIso ? dayjs(b.startIso).valueOf() : 0;
        return aStart - bStart;
    });
}

// Convert backend schedule-block payloads into the shared calendar event shape.
export function parseRawBlockToEvent(block: RawScheduleBlock): CalendarEvent {
    const start = dayjs(block.start);
    const end = dayjs(block.end);

    return {
        id: block.id,
        name: "Blocked time",
        date: start.format("ddd M/D"),
        startTime: start.format("h:mm A"),
        endTime: end.format("h:mm A"),
        description: block.reason?.trim() ? block.reason.trim() : "Admin block",
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        color: "#111827",
        borderColor: "#030712",
        textColor: "#ffffff",
        isBlock: true,
    };
}
