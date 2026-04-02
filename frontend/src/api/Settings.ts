import {extractErrorMessage} from "./Admin.ts";
import type {CalendarData} from "../types.ts";
import {parseTime} from "../util/Time.ts";
import dayjs from "dayjs";

type RawAppSettingsData = {
    startDay: "WEEK" | "CURR_DAY";
    startDate: string;
    startTime: string;
    endTime: string;
    timeStep: number;
    maxReservationTime: number;
    numDaysToShow: number;
}

interface ParsedAppSettingsData extends CalendarData {
    firstDateToShow: "week" | "day";
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
        startTime: dayjs().startOf("day").hour(parsedStartTime.hour).minute(parsedStartTime!.minute),
        endTime: dayjs().startOf("day").hour(parsedEndTime.hour).minute(parsedEndTime!.minute),
        timeStep: rawAppData.timeStep,
        maxResTime: rawAppData.maxReservationTime,
        numDays: rawAppData.numDaysToShow,
        firstDateToShow: parsedStartDay,
    }
}