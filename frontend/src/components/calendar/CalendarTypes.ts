import type {Dayjs} from "dayjs";
import type {CalendarEvent} from "../../types.ts";

/**
 * Defines the props required by the Calendar component.
 */
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
    focusStartIso?: string;
    onEditReservation?: (id: number, start: Dayjs, end: Dayjs) => Promise<void> | void;
    onDeleteReservation?: (id: number) => Promise<void> | void;
}

/**
 * Defines the props required by the CalendarContent component.
 */
export interface CalendarContentProps {
    firstDate: Dayjs,
    startTime: Dayjs,
    endTime: Dayjs,
    timeStepMin: number,
    top: number,
    left: number,
    height: number,
    width: number,
    numRows: number,
    cellHeight: number,
    numDays: number,
    dayMap: Map<string, number>,
    timeMap: Map<string, number>,
    events: CalendarEvent[],
    onEditReservation?: (id: number, start: Dayjs, end: Dayjs) => Promise<void> | void;
    onDeleteReservation?: (id: number) => Promise<void> | void;
    variant: "user" | "equip" | "trainer"
}
