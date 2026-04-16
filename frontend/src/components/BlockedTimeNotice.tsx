import {useMemo} from "react";
import type {CalendarEvent} from "../types.ts";

type BlockedTimeNoticeProps = {
    events?: CalendarEvent[];
    className?: string;
};

export default function BlockedTimeNotice({events = [], className = ""}: BlockedTimeNoticeProps) {
    const blockedEvents = useMemo(() => {
        return events
            .filter((event) => event.isBlock && !event.isAvailability && !event.isWeekend && event.startIso && event.endIso)
            .sort((a, b) => (a.startIso ?? "").localeCompare(b.startIso ?? ""));
    }, [events]);

    const groupedBlocks = useMemo(() => {
        const groups = new Map<string, CalendarEvent[]>();

        blockedEvents.forEach((event) => {
            const existing = groups.get(event.date) ?? [];
            existing.push(event);
            groups.set(event.date, existing);
        });

        return Array.from(groups.entries());
    }, [blockedEvents]);

    if (groupedBlocks.length === 0) {
        return null;
    }

    return (
        <div className={`rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 ${className}`}>
            <p className="font-semibold">Blocked times</p>
            <p className="mt-1 text-xs text-slate-700">
                These windows are greyed out on the calendar and cannot be reserved.
            </p>
            <ul className="mt-2 space-y-1">
                {groupedBlocks.map(([date, dayBlocks]) => (
                    <li key={date}>
                        <span className="font-semibold">{date}:</span>{" "}
                        {dayBlocks.map((block) => (
                            <span key={block.id} className="mr-2">
                                {block.startTime} - {block.endTime}
                                {block.description ? ` (${block.description})` : ""}
                            </span>
                        ))}
                    </li>
                ))}
            </ul>
        </div>
    );
}
