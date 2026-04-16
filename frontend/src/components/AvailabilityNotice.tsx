import {useMemo} from "react";
import dayjs from "dayjs";
import type {CalendarEvent} from "../types.ts";

type AvailabilityNoticeProps = {
    events?: CalendarEvent[];
    className?: string;
};

export default function AvailabilityNotice({events = [], className = ""}: AvailabilityNoticeProps) {
    const availabilityEvents = useMemo(() => {
        return events
            .filter((event) => event.isAvailability && event.startIso && event.endIso)
            .sort((a, b) => dayjs(a.startIso).valueOf() - dayjs(b.startIso).valueOf());
    }, [events]);

    const groupedWindows = useMemo(() => {
        const groups = new Map<string, string[]>();

        availabilityEvents.forEach((event) => {
            const windowLabel = `${event.startTime} - ${event.endTime}`;
            const existing = groups.get(event.date) ?? [];
            existing.push(windowLabel);
            groups.set(event.date, existing);
        });

        return Array.from(groups.entries());
    }, [availabilityEvents]);

    if (groupedWindows.length === 0) {
        return null;
    }

    return (
        <div className={`rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ${className}`}>
            <p className="font-semibold">Additional available times</p>
            <p className="mt-1 text-xs text-emerald-800">
                These windows are available in addition to the normal 8:00 AM to 5:00 PM calendar.
            </p>
            <ul className="mt-2 space-y-1">
                {groupedWindows.map(([date, windows]) => (
                    <li key={date}>
                        <span className="font-semibold">{date}:</span> {windows.join(", ")}
                    </li>
                ))}
            </ul>
        </div>
    );
}
