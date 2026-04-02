import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import { parseRawResToEvent, parseRawResToRes, parseResToEvent } from "../../../src/util/ParseReservation.ts";

describe("ParseReservation utils", () => {
    it("parses a raw reservation into a reservation object", () => {
        // Raw api payload should map to internal reservation fields
        const raw = {
            id: 7,
            equipmentName: "Ice Bath",
            start: "2026-03-18T09:30:00",
            end: "2026-03-18T10:45:00",
        };

        const result = parseRawResToRes(raw);

        expect(result.id).toBe(raw.id);
        expect(result.name).toBe(raw.equipmentName);
        expect(result.start.format("YYYY-MM-DD HH:mm")).toBe("2026-03-18 09:30");
        expect(result.end.format("YYYY-MM-DD HH:mm")).toBe("2026-03-18 10:45");
    });

    it("parses a reservation into a calendar event", () => {
        // Calendar event formatting is human readable
        const reservation = {
            id: 9,
            name: "Ice Bath",
            start: dayjs("2026-03-19T13:15:00"),
            end: dayjs("2026-03-19T14:30:00"),
        };

        const result = parseResToEvent(reservation);

        expect(result).toEqual({
            id: 9,
            name: "Ice Bath",
            startTime: "1:15 PM",
            endTime: "2:30 PM",
            date: dayjs("2026-03-19T13:15:00").format("ddd M/D"),
            startIso: dayjs("2026-03-19T13:15:00").toISOString(),
            endIso: dayjs("2026-03-19T14:30:00").toISOString(),
            color: undefined,
            description: undefined,
        });
    });

    it("parses a raw reservation directly into a calendar event", () => {
        // This path combines both parse helpers
        const raw = {
            id: 12,
            equipmentName: "Ice Bath",
            start: "2026-03-20T06:00:00",
            end: "2026-03-20T06:30:00",
        };

        const result = parseRawResToEvent(raw);

        expect(result).toEqual({
            id: 12,
            name: "Ice Bath",
            startTime: "6:00 AM",
            endTime: "6:30 AM",
            date: dayjs(raw.start).format("ddd M/D"),
            startIso: dayjs(raw.start).toISOString(),
            endIso: dayjs(raw.end).toISOString(),
            color: undefined,
            description: undefined,
        });
    });
});
