import type {Dayjs} from "dayjs";
import type {CalendarEvent} from "../../types.ts";

export interface CalendarProps {
    firstDate: Dayjs;
    numDays: number;
    startTime: Dayjs;
    endTime: Dayjs;
    timeStepMin: number
}

export interface CalendarContentProps {
    top: number,
    left: number,
    height: number,
    width: number,
    cellHeight: number,
    numDays: number,
    dayMap: Map<string, number>,
    timeMap: Map<string, number>,
    events: CalendarEvent[]
}