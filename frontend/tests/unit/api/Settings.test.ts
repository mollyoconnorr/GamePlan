import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAppSettings, updateAppSettings } from "../../../src/api/Settings.ts";

function response(ok: boolean, data?: unknown, textBody = ""): Response {
    return {
        ok,
        json: vi.fn().mockResolvedValue(data),
        text: vi.fn().mockResolvedValue(textBody),
    } as unknown as Response;
}

describe("Settings API", () => {
    beforeEach(() => {
        vi.unstubAllGlobals();
    });

    it("updates settings and maps request payload correctly", async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            response(true, {
                startDay: "WEEK",
                startDate: "2026-04-13",
                startTime: "08:00:00",
                endTime: "17:00:00",
                timeStep: 30,
                maxReservationTime: 120,
                numDaysToShow: 7,
                weekendAutoBlockEnabled: true,
            }),
        );
        vi.stubGlobal("fetch", fetchMock);

        const result = await updateAppSettings({
            firstDateToShow: "week",
            numDaysInput: "7",
            timeStepInput: "30",
            maxResTimeInput: "120",
            startTimeInput: "08:00",
            endTimeInput: "17:00",
            weekendAutoBlockEnabled: true,
        });

        expect(result.firstDateToShow).toBe("week");
        expect(result.timeStep).toBe(30);
        expect(result.maxResTime).toBe(120);
        expect(result.weekendAutoBlockEnabled).toBe(true);
        expect(result.startTime.format("HH:mm")).toBe("08:00");
        expect(result.endTime.format("HH:mm")).toBe("17:00");

        expect(fetchMock).toHaveBeenCalledWith("/api/admin/settings", {
            method: "PUT",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                startDay: "WEEK",
                startTime: "08:00:00",
                endTime: "17:00:00",
                timeStep: 30,
                maxReservationTime: 120,
                numDaysToShow: 7,
                weekendAutoBlockEnabled: true,
            }),
        });
    });

    it("rejects invalid settings payload before network call", async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        await expect(
            updateAppSettings({
                firstDateToShow: "day",
                numDaysInput: "not-a-number",
                timeStepInput: "15",
                maxResTimeInput: "60",
                startTimeInput: "08:00",
                endTimeInput: "17:00",
            }),
        ).rejects.toThrow("Invalid app settings payload");

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("fetches and parses app settings", async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            response(true, {
                startDay: "CURR_DAY",
                startDate: "2026-04-16",
                startTime: "09:15:00",
                endTime: "18:30:00",
                timeStep: 15,
                maxReservationTime: 90,
                numDaysToShow: 5,
                weekendAutoBlockEnabled: false,
            }),
        );
        vi.stubGlobal("fetch", fetchMock);

        const result = await getAppSettings();

        expect(result.firstDateToShow).toBe("day");
        expect(result.startTime.format("HH:mm")).toBe("09:15");
        expect(result.endTime.format("HH:mm")).toBe("18:30");
        expect(result.numDays).toBe(5);
        expect(result.weekendAutoBlockEnabled).toBe(false);
    });

    it("throws extracted backend message when settings request fails", async () => {
        const fetchMock = vi.fn().mockResolvedValue(response(false, undefined, "{\"message\":\"no access\"}"));
        vi.stubGlobal("fetch", fetchMock);

        await expect(getAppSettings()).rejects.toThrow("no access");
    });

    it("throws on invalid app settings response formats", async () => {
        const badTimeFetch = vi.fn().mockResolvedValue(
            response(true, {
                startDay: "WEEK",
                startDate: "2026-04-16",
                startTime: "bad-time",
                endTime: "17:00:00",
                timeStep: 15,
                maxReservationTime: 60,
                numDaysToShow: 7,
            }),
        );
        vi.stubGlobal("fetch", badTimeFetch);
        await expect(getAppSettings()).rejects.toThrow("Invalid app settings time format");

        const badDateFetch = vi.fn().mockResolvedValue(
            response(true, {
                startDay: "WEEK",
                startDate: "not-a-date",
                startTime: "08:00:00",
                endTime: "17:00:00",
                timeStep: 15,
                maxReservationTime: 60,
                numDaysToShow: 7,
            }),
        );
        vi.stubGlobal("fetch", badDateFetch);
        await expect(getAppSettings()).rejects.toThrow("Invalid app settings startDate");
    });
});
