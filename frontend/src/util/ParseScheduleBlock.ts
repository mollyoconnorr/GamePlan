import dayjs from "dayjs";
import type {CalendarEvent, RawScheduleBlock} from "../types.ts";

// Keep block events chronologically ordered so Calendar rendering is deterministic.
/**
 * Sorts calendar events by their ISO start timestamp so notices render chronologically.
 */
export function sortEventsByStartIso(events: CalendarEvent[]) {
    return [...events].sort((a, b) => {
        const aStart = a.startIso ? dayjs(a.startIso).valueOf() : 0;
        const bStart = b.startIso ? dayjs(b.startIso).valueOf() : 0;
        return aStart - bStart;
    });
}

// Convert backend schedule-block payloads into the shared calendar event shape.
/**
 * Parses input into RawBlockToEvent.
 */
export function parseRawBlockToEvent(block: RawScheduleBlock): CalendarEvent {
    const start = dayjs(block.start);
    const end = dayjs(block.end);
    const blockType = (block.blockType ?? "BLOCK").toUpperCase();
    const isAvailability = blockType === "OPEN";
    const isWeekend = blockType === "WEEKEND";

    return {
        id: block.id,
        name: isAvailability ? "Open window" : isWeekend ? "Weekend blocked" : "Blocked time",
        date: start.format("ddd M/D"),
        startTime: start.format("h:mm A"),
        endTime: end.format("h:mm A"),
        description: block.reason?.trim()
            ? block.reason.trim()
            : isAvailability
                ? "Open gym time"
                : isWeekend
                    ? "Weekend closed"
                    : "Admin block",
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        color: isAvailability ? "#166534" : isWeekend ? "#7c2d12" : "#111827",
        borderColor: isAvailability ? "#14532d" : isWeekend ? "#431407" : "#030712",
        textColor: "#ffffff",
        isBlock: true,
        isAvailability,
        isWeekend,
        blockType,
    };
}
