import type {CalendarEvent, RawAdminReservation, RawReservation, Reservation} from "../types.ts";
import dayjs from "dayjs";

/**
 * Parses input into RawResToRes.
 */
export function parseRawResToRes(reservation: RawReservation): Reservation {
    return {
        start: dayjs(reservation.start),
        end: dayjs(reservation.end),
        name: reservation.equipmentName,
        id: reservation.id,
        color: reservation.color ?? undefined,
    };
}

/**
 * Parses input into ResToEvent.
 */
export function parseResToEvent(reservation: Reservation): CalendarEvent {
    return {
        id: reservation.id,
        startTime: reservation.start.format("h:mm A"),
        endTime: reservation.end.format("h:mm A"),
        name: reservation.name,
        date: reservation.start.format("ddd M/D"),
        startIso: reservation.start.toISOString(),
        endIso: reservation.end.toISOString(),
        color: reservation.color,
        description: reservation.description,
    };
}

/**
 * Parses input into RawResToEvent.
 */
export function parseRawResToEvent(reservation: RawReservation): CalendarEvent {
    return parseResToEvent(parseRawResToRes(reservation));
}

/**
 * Parses input into AdminRawResToEvent.
 */
export function parseAdminRawResToEvent(reservation: RawAdminReservation): CalendarEvent {
    const athleteName = [reservation.athleteFirstName, reservation.athleteLastName]
        .filter(Boolean)
        .join(" ");

    return {
        id: reservation.id,
        startTime: dayjs(reservation.start).format("h:mm A"),
        endTime: dayjs(reservation.end).format("h:mm A"),
        name: reservation.equipmentName,
        date: dayjs(reservation.start).format("ddd M/D"),
        description: athleteName || "Athlete reservation",
        startIso: reservation.start,
        endIso: reservation.end,
        color: reservation.color,
    };
}

/**
 * Parses input into AdminRawResToRes.
 */
export function parseAdminRawResToRes(reservation: RawAdminReservation): Reservation {
    const athleteName = [reservation.athleteFirstName, reservation.athleteLastName]
        .filter(Boolean)
        .join(" ");

    return {
        start: dayjs(reservation.start),
        end: dayjs(reservation.end),
        name: reservation.equipmentName,
        id: reservation.id,
        color: reservation.color ?? undefined,
        description: athleteName || "Athlete reservation",
    };
}