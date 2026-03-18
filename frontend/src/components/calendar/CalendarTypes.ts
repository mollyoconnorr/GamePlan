import type {Dayjs} from "dayjs";
import type {CalendarEvent} from "../../types.ts";

export interface CalendarProps {
    firstDate: Dayjs;
    numDays: number;
    startTime: Dayjs;
    endTime: Dayjs;
    timeStepMin: number
    variant: "user" | "equip" | "trainer"
    reservations?: CalendarEvent[];
    equipmentId?: number;
    loading: boolean;
    onDeleteReservation?: (id: number) => Promise<void> | void;
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
    events: CalendarEvent[],
    onDeleteReservation?: (id: number) => Promise<void> | void;
    variant: "user" | "equip" | "trainer"
}