import type {RawReservation, Reservation} from "../types.ts";
import dayjs from "dayjs";

export function parseRawResToRes(reservation: RawReservation ) : Reservation {
    const startDate = dayjs(reservation.start);
    const endDate = dayjs(reservation.end);

    return {
        start: startDate,
        end: endDate,
        name: reservation.equipmentName,
        id: reservation.id,
    }
}