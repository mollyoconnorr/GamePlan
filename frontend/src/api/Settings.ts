import {extractErrorMessage} from "./Admin.ts";
import type {CalendarData} from "../types.ts";
import {formatTwoDigits, parseTime, parseWholeNumber} from "../util/Time.ts";
import dayjs from "dayjs";

type RawAppSettingsData = {
    startDay: "WEEK" | "CURR_DAY";
    startDate: string;
    startTime: string;
    endTime: string;
    timeStep: number;
    maxReservationTime: number;
    numDaysToShow: number;
    weekendAutoBlockEnabled?: boolean;
}

export interface ParsedAppSettingsData extends CalendarData {
    firstDateToShow: "week" | "day";
    weekendAutoBlockEnabled: boolean;
}

type SettingsRequest = {
    firstDateToShow: "week" | "day";
    numDaysInput: string;
    timeStepInput: string;
    maxResTimeInput: string;
    startTimeInput: string;
    endTimeInput: string;
    weekendAutoBlockEnabled?: boolean;
};

type AppSettingsUpdatePayload = {
    startDay: "WEEK" | "CURR_DAY";
    startTime: string;
    endTime: string;
    timeStep: number;
    maxReservationTime: number;
    numDaysToShow: number;
    weekendAutoBlockEnabled?: boolean;
};

/**
 * Validates form input and sends canonical app settings payload to backend.
 */
export async function updateAppSettings(request: SettingsRequest): Promise<ParsedAppSettingsData> {
    const payload = toAppSettingsUpdatePayload(request);

    const res = await fetch("/api/admin/settings", {
        method: "PUT",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const message = await extractErrorMessage(res, "Failed to update app settings!");
        throw new Error(message);
    }

    return parseAppDataToAppSettings(await res.json() as RawAppSettingsData);
}

function toAppSettingsUpdatePayload(request: SettingsRequest): AppSettingsUpdatePayload {
    const numDaysToShow = parseWholeNumber(request.numDaysInput);
    const timeStep = parseWholeNumber(request.timeStepInput);
    const maxReservationTime = parseWholeNumber(request.maxResTimeInput);
    const startTime = parseTime(request.startTimeInput);
    const endTime = parseTime(request.endTimeInput);

    if (
        numDaysToShow === null ||
        timeStep === null ||
        maxReservationTime === null ||
        !startTime ||
        !endTime
    ) {
        throw new Error("Invalid app settings payload");
    }

    const startDay = request.firstDateToShow === "week" ? "WEEK" : "CURR_DAY";
    const startHour = formatTwoDigits(startTime.hour);
    const startMinute = formatTwoDigits(startTime.minute);
    const endHour = formatTwoDigits(endTime.hour);
    const endMinute = formatTwoDigits(endTime.minute);

    return {
        startDay,
        startTime: `${startHour}:${startMinute}:00`,
        endTime: `${endHour}:${endMinute}:00`,
        timeStep,
        maxReservationTime,
        numDaysToShow,
        weekendAutoBlockEnabled: request.weekendAutoBlockEnabled,
    };
}

export async function getAppSettings(): Promise<ParsedAppSettingsData>{
    const res = await fetch("/api/admin/settings", {
        method: "GET",
        credentials: "include",
    });

    if (!res.ok) {
        const message = await extractErrorMessage(res, "Failed to fetch app settings.");
        throw new Error(message);
    }

    return parseAppDataToAppSettings(await res.json() as RawAppSettingsData);
}

function parseAppDataToAppSettings(rawAppData: RawAppSettingsData): ParsedAppSettingsData {
    // Backend stores times as strings; UI works with dayjs objects for comparisons/math.
    const parsedStartTime = parseTime(rawAppData.startTime);
    const parsedEndTime = parseTime(rawAppData.endTime);

    if (!parsedStartTime || !parsedEndTime) {
        throw new Error("Invalid app settings time format");
    }

    const parsedStartDay = rawAppData.startDay === "WEEK" ? "week" : "day";

    const parsedStartDate = dayjs(rawAppData.startDate, "YYYY-MM-DD", true);
    if (!parsedStartDate.isValid()) {
        throw new Error("Invalid app settings startDate");
    }

    return {
        firstDate: parsedStartDate,
        startTime: dayjs().startOf("day").hour(parsedStartTime.hour).minute(parsedStartTime.minute),
        endTime: dayjs().startOf("day").hour(parsedEndTime.hour).minute(parsedEndTime.minute),
        timeStep: rawAppData.timeStep,
        maxResTime: rawAppData.maxReservationTime,
        numDays: rawAppData.numDaysToShow,
        firstDateToShow: parsedStartDay,
        weekendAutoBlockEnabled: Boolean(rawAppData.weekendAutoBlockEnabled),
    }
}
