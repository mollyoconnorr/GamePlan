import type {RawReservation} from "../types.ts";
import dayjs from "dayjs";

export function parseRawResToEvent(reservation: RawReservation ) {
    const startDate = dayjs(reservation.start);
    const endDate = dayjs(reservation.end);

    return {
        id: reservation.id,
        startTime: startDate.format("h:mm A"),
        endTime: endDate.format("h:mm A"),
        name: reservation.equipmentName,
        date: startDate.format("ddd M/D"),
    }
}