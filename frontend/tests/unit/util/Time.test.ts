import { describe, expect, it } from "vitest";
import { formatTwoDigits, parseTime, parseWholeNumber } from "../../../src/util/Time.ts";

describe("Time utilities", () => {
    it("formats single-digit numbers with a leading zero", () => {
        expect(formatTwoDigits(0)).toBe("00");
        expect(formatTwoDigits(7)).toBe("07");
        expect(formatTwoDigits(12)).toBe("12");
    });

    it("parses whole numbers and rejects invalid numeric strings", () => {
        expect(parseWholeNumber("15")).toBe(15);
        expect(parseWholeNumber("  -4 ")).toBe(-4);
        expect(parseWholeNumber("")).toBeNull();
        expect(parseWholeNumber("5.2")).toBeNull();
        expect(parseWholeNumber("abc")).toBeNull();
    });

    it("parses strict HH:mm or HH:mm:ss time strings", () => {
        expect(parseTime("08:30")).toEqual({
            hour: 8,
            minute: 30,
            totalMinutes: 510,
        });

        expect(parseTime("23:59:00")).toEqual({
            hour: 23,
            minute: 59,
            totalMinutes: 1439,
        });
    });

    it("rejects invalid time formats and out-of-range values", () => {
        expect(parseTime("8:30")).toBeNull();
        expect(parseTime("24:00")).toBeNull();
        expect(parseTime("12:60")).toBeNull();
        expect(parseTime("not-time")).toBeNull();
    });
});
