import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import { parseRawBlockToEvent, sortEventsByStartIso } from "../../../src/util/ParseScheduleBlock.ts";
import type { CalendarEvent } from "../../../src/types.ts";

describe("ParseScheduleBlock utils", () => {
    it("sorts events by start ISO timestamp", () => {
        const events: CalendarEvent[] = [
            { id: 3, name: "C", date: "Thu 4/16", startTime: "9:00 AM", endTime: "10:00 AM", startIso: "2026-04-16T16:00:00.000Z", endIso: "2026-04-16T17:00:00.000Z" },
            { id: 1, name: "A", date: "Thu 4/16", startTime: "7:00 AM", endTime: "8:00 AM", startIso: "2026-04-16T14:00:00.000Z", endIso: "2026-04-16T15:00:00.000Z" },
            { id: 2, name: "B", date: "Thu 4/16", startTime: "8:00 AM", endTime: "9:00 AM", startIso: "2026-04-16T15:00:00.000Z", endIso: "2026-04-16T16:00:00.000Z" },
        ];

        const sorted = sortEventsByStartIso(events);

        expect(sorted.map((event) => event.id)).toEqual([1, 2, 3]);
    });

    it("parses OPEN blocks with availability defaults", () => {
        const raw = {
            id: 5,
            start: "2026-04-18T09:00:00.000Z",
            end: "2026-04-18T11:00:00.000Z",
            reason: "",
            blockType: "OPEN",
        };

        const event = parseRawBlockToEvent(raw);

        expect(event.name).toBe("Open window");
        expect(event.description).toBe("Open gym time");
        expect(event.isAvailability).toBe(true);
        expect(event.isWeekend).toBe(false);
        expect(event.blockType).toBe("OPEN");
    });

    it("parses WEEKEND blocks with weekend defaults", () => {
        const raw = {
            id: 6,
            start: "2026-04-19T09:00:00.000Z",
            end: "2026-04-19T11:00:00.000Z",
            reason: null,
            blockType: "WEEKEND",
        };

        const event = parseRawBlockToEvent(raw);

        expect(event.name).toBe("Weekend blocked");
        expect(event.description).toBe("Weekend closed");
        expect(event.isAvailability).toBe(false);
        expect(event.isWeekend).toBe(true);
        expect(event.color).toBe("#7c2d12");
    });

    it("falls back to BLOCK defaults and trims custom reason", () => {
        const raw = {
            id: 7,
            start: "2026-04-20T09:00:00.000Z",
            end: "2026-04-20T11:00:00.000Z",
            reason: "  Team training  ",
            blockType: null,
        };

        const event = parseRawBlockToEvent(raw);

        expect(event.name).toBe("Blocked time");
        expect(event.description).toBe("Team training");
        expect(event.blockType).toBe("BLOCK");
        expect(event.date).toBe(dayjs(raw.start).format("ddd M/D"));
    });
});
