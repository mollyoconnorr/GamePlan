import type {CalendarEvent, RawReservation, Reservation} from "../types.ts";
import dayjs from "dayjs";

export function parseRawResToRes(reservation: RawReservation): Reservation {
    return {
        start: dayjs(reservation.start),
        end: dayjs(reservation.end),
        name: reservation.equipmentName,
        id: reservation.id,
    };
}

export function parseResToEvent(reservation: Reservation): CalendarEvent {
    return {
        id: reservation.id,
        startTime: reservation.start.format("h:mm A"),
        endTime: reservation.end.format("h:mm A"),
        name: reservation.name,
        date: reservation.start.format("ddd M/D"),
    };
}

export function parseRawResToEvent(reservation: RawReservation): CalendarEvent {
    return parseResToEvent(parseRawResToRes(reservation));
}
