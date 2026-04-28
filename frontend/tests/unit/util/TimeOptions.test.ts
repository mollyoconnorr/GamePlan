import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import {
    buildTimeOptions,
    filterEndTimesByMaxDuration,
    filterPastTimesForDate
} from "../../../src/util/TimeOptions.ts";

describe("TimeOptions utilities", () => {
    it("builds time options across a valid time window", () => {
        const start = dayjs("2026-04-16T08:00:00");
        const end = dayjs("2026-04-16T09:00:00");

        const options = buildTimeOptions(start, end, 30);

        expect(options).toEqual([
            { value: "08:00", label: "8:00 AM" },
            { value: "08:30", label: "8:30 AM" },
            { value: "09:00", label: "9:00 AM" },
        ]);
    });

    it("returns no options for invalid step or inverted range", () => {
        const start = dayjs("2026-04-16T10:00:00");
        const end = dayjs("2026-04-16T09:00:00");

        expect(buildTimeOptions(start, end, 30)).toEqual([]);
        expect(buildTimeOptions(dayjs("2026-04-16T08:00:00"), dayjs("2026-04-16T09:00:00"), 0)).toEqual([]);
    });

    it("filters out all times for past days", () => {
        const options = [{ value: "08:00", label: "8:00 AM" }];
        const now = dayjs("2026-04-16T10:00:00");
        const selectedDate = dayjs("2026-04-15");

        expect(filterPastTimesForDate(options, selectedDate, now)).toEqual([]);
    });

    it("keeps all times for future days and null selection", () => {
        const options = [
            { value: "08:00", label: "8:00 AM" },
            { value: "09:00", label: "9:00 AM" },
        ];
        const now = dayjs("2026-04-16T10:00:00");

        expect(filterPastTimesForDate(options, null, now)).toEqual(options);
        expect(filterPastTimesForDate(options, dayjs("2026-04-17"), now)).toEqual(options);
    });

    it("filters earlier slots on the current day and drops malformed values", () => {
        const options = [
            { value: "08:00", label: "8:00 AM" },
            { value: "10:00", label: "10:00 AM" },
            { value: "bad", label: "bad" },
            { value: "10:30", label: "10:30 AM" },
        ];
        const now = dayjs("2026-04-16T10:00:00");
        const selectedDate = dayjs("2026-04-16");

        expect(filterPastTimesForDate(options, selectedDate, now)).toEqual([
            { value: "10:00", label: "10:00 AM" },
            { value: "10:30", label: "10:30 AM" },
        ]);
    });

    it("limits end time options by the configured max reservation duration", () => {
        const options = [
            { value: "09:00", label: "9:00 AM" },
            { value: "09:30", label: "9:30 AM" },
            { value: "10:00", label: "10:00 AM" },
            { value: "10:30", label: "10:30 AM" },
            { value: "11:00", label: "11:00 AM" },
        ];

        expect(filterEndTimesByMaxDuration(options, "09:00", 120)).toEqual([
            { value: "09:30", label: "9:30 AM" },
            { value: "10:00", label: "10:00 AM" },
            { value: "10:30", label: "10:30 AM" },
            { value: "11:00", label: "11:00 AM" },
        ]);
        expect(filterEndTimesByMaxDuration(options, "09:00", 30)).toEqual([
            { value: "09:30", label: "9:30 AM" },
        ]);
    });
});
