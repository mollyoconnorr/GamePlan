import {useMemo} from "react";
import type {CalendarData, Reservation} from "../types.ts";

type OffHoursReservationNoticeProps = CalendarData & {
    reservations?: Reservation[];
    className?: string;
};

export default function OffHoursReservationNotice({
    reservations = [],
    startTime,
    endTime,
    className = "",
}: OffHoursReservationNoticeProps) {
    const offHoursReservations = useMemo(() => {
        return reservations
            .filter((reservation) => {
                const dayStart = reservation.start.startOf("day");
                const dayStartBoundary = dayStart.hour(startTime.hour()).minute(startTime.minute()).second(0).millisecond(0);
                const dayEndBoundary = dayStart.hour(endTime.hour()).minute(endTime.minute()).second(0).millisecond(0);

                return reservation.start.isBefore(dayStartBoundary) || reservation.end.isAfter(dayEndBoundary);
            })
            .sort((a, b) => a.start.valueOf() - b.start.valueOf());
    }, [endTime, reservations, startTime]);

    const groupedReservations = useMemo(() => {
        const groups = new Map<string, Reservation[]>();

        offHoursReservations.forEach((reservation) => {
            const dateKey = reservation.start.format("ddd M/D");
            const existing = groups.get(dateKey) ?? [];
            existing.push(reservation);
            groups.set(dateKey, existing);
        });

        return Array.from(groups.entries());
    }, [offHoursReservations]);

    if (groupedReservations.length === 0) {
        return null;
    }

    return (
        <div className={`rounded border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 ${className}`}>
            <p className="font-semibold">Reservations outside normal hours</p>
            <p className="mt-1 text-xs text-sky-800">
                These reservations happen outside the normal 8:00 AM to 5:00 PM calendar view.
            </p>
            <ul className="mt-2 space-y-1">
                {groupedReservations.map(([date, dayReservations]) => (
                    <li key={date}>
                        <span className="font-semibold">{date}:</span>{" "}
                        {dayReservations.map((reservation) => (
                            <span key={reservation.id} className="mr-2">
                                {reservation.name} {reservation.start.format("h:mm A")} - {reservation.end.format("h:mm A")}
                            </span>
                        ))}
                    </li>
                ))}
            </ul>
        </div>
    );
}
