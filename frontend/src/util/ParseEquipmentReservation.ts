// ParseEquipmentReservation.ts
import dayjs from "dayjs";
import type { CalendarEvent } from "../types.ts";

export function parseEquipmentResToEvent(res: any): CalendarEvent {
  return {
    date: dayjs(res.start).format("ddd M/D"), // calendar day column
    startTime: dayjs(res.start).format("h:mm A"),
    endTime: dayjs(res.end).format("h:mm A"),
    startTimeObj: dayjs(res.start), // for comparison
    endTimeObj: dayjs(res.end),     // for comparison
    name: res.userName || "Reserved",
  };
}