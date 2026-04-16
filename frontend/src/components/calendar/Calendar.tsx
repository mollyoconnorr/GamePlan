import type {CalendarProps} from "./CalendarTypes.ts";
import React, {type JSX, useEffect, useMemo, useRef, useState} from "react";
import CalendarContent from "./CalendarContent.tsx";
import Spinner from "../Spinner.tsx";
import dayjs from "dayjs";

/**
 * Calendar grid renderer.
 * Draws static day/time slots first, then overlays reservation cards via CalendarContent.
 */
export default function Calendar(props: CalendarProps) {
    const TIME_W = 90;
    const CELL_H = 40;
    const DAY_MIN_W = 140;
    // Background shading is driven by block/availability events only.
    const backgroundEvents = useMemo(() => {
        return (props.reservations ?? []).filter((event) => (
            Boolean(event.startIso && event.endIso) && (event.isBlock || event.isAvailability)
        ));
    }, [props.reservations]);

    const numRows =
        props.endTime.diff(props.startTime, "minute") / props.timeStepMin;

    const minWidth = TIME_W + props.numDays * DAY_MIN_W;

    // Grid style for header row with dates
    const headerGridStyle: React.CSSProperties = {
        gridTemplateColumns: `${TIME_W}px repeat(${props.numDays}, minmax(${DAY_MIN_W}px, 1fr))`,
        minWidth,
    };

    // Grid style for body of calendar
    const bodyGridStyle: React.CSSProperties = {
        gridTemplateColumns: `repeat(${props.numDays}, minmax(${DAY_MIN_W}px, 1fr))`,
        minWidth: props.numDays * DAY_MIN_W,
    };

    // Create day headers
    const dayHTML: JSX.Element[] = [];
    const dayMap: Map<string, number> = new Map();
    for (let i = 0; i < props.numDays; i++) {
        const currDay: string = props.firstDate.add(i, "days").format("ddd M/D");

        dayHTML.push(
            <div
                key={i}
                className="border-x-1 text-center p-2 font-semibold"
            >
                {currDay}
            </div>
        );

        dayMap.set(currDay, i);
    }

    // Creates the time column
    const timeColHTML: JSX.Element[] = [];
    const timeMap: Map<string, number> = new Map();
    for (let i = 0; i <= numRows; i++) {
        const currTime: string = props.startTime
            .add(i * props.timeStepMin, "minute").format("h:mm A");

        timeColHTML.push(
            <div
                key={i}
                className="border-y text-center p-2 bg-gray-400"
                style={{ width: TIME_W, height: CELL_H }}
            >
                {currTime}
            </div>
        );

        timeMap.set(currTime, i);
    }

    // Blocked slots take priority. Otherwise show availability tint.
    const getCellBackground = (dayIdx: number, rowIdx: number) => {
        const dayDate = props.firstDate.add(dayIdx, "day");
        const slotStart = dayDate
            .hour(props.startTime.hour())
            .minute(props.startTime.minute())
            .second(props.startTime.second())
            .millisecond(0)
            .add(rowIdx * props.timeStepMin, "minute");
        const slotEnd = slotStart.add(props.timeStepMin, "minute");
        const blockedWindowHit = backgroundEvents.some((event) => {
            if (event.isAvailability) {
                return false;
            }

            if (!event.startIso || !event.endIso) {
                return false;
            }

            const eventStart = dayjs(event.startIso);
            const eventEnd = dayjs(event.endIso);
            return slotStart.isBefore(eventEnd) && eventStart.isBefore(slotEnd);
        });

        const openWindowHit = backgroundEvents.some((event) => {
            if (!event.startIso || !event.endIso) {
                return false;
            }

            const eventStart = dayjs(event.startIso);
            const eventEnd = dayjs(event.endIso);
            return slotStart.isBefore(eventEnd) && eventStart.isBefore(slotEnd);
        });

        // Default to available unless a block event explicitly marks the slot unavailable.
        const baseAvailabilityHit = true;

        if (blockedWindowHit) {
            return "#475569";
        }

        if (openWindowHit) {
            return "rgba(16, 185, 129, 0.22)";
        }

        if (baseAvailabilityHit) {
            return "rgba(16, 185, 129, 0.22)";
        }

        return "#475569";
    };

    // Used to align absolutely-positioned overlay events with the rendered grid width.
    const divRef = useRef<HTMLDivElement | null>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!divRef.current) return;

        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            setSize({ width, height });
        });

        observer.observe(divRef.current);

        return () => observer.disconnect();
    }, []);

    return (
        <div className="relative bg-gray-300 rounded-sm border shadow-md overflow-x-auto overflow-y-auto">
            {/* HEADER ROW */}
            <div className="sticky top-0 z-30 grid bg-gray-400" style={headerGridStyle} ref={divRef}>
                {/* top-left corner cell */}
                <div className="p-2 border-b" />

                {/* day headers */}
                {dayHTML}
            </div>

            {/* BODY */}
            <div className="max-h-[60vh] flex flex-row" style={{ minWidth }}>
                {/* TIME COLUMN */}
                <div className="sticky left-0 flex-shrink-0 flex flex-col z-20">
                    {timeColHTML}
                </div>

                {/* DAY COLUMNS */}
                <div className="grid flex-1 min-w-0" style={bodyGridStyle}>
                    {Array.from({ length: props.numDays }).map((_, dayIdx) => (
                        <div key={dayIdx} className="border">
                            {Array.from({ length: numRows + 1 }).map((__, rowIdx) => (
                                <div
                                    key={rowIdx}
                                    className="border-b p-2"
                                    style={{
                                        height: CELL_H,
                                        backgroundColor: getCellBackground(dayIdx, rowIdx),
                                    }}
                                >
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {props.loading && <Spinner />}

            {!props.loading && props.reservations && (
                <CalendarContent
                    firstDate={props.firstDate}
                    startTime={props.startTime}
                    endTime={props.endTime}
                    timeStepMin={props.timeStepMin}
                    top={CELL_H}
                    left={TIME_W}
                    height={CELL_H * (numRows + 1)}
                    width={size.width - TIME_W}
                    numDays={props.numDays}
                    cellHeight={CELL_H}
                    numRows={numRows}
                    dayMap={dayMap}
                    timeMap={timeMap}
                    events={props.reservations}
                    onEditReservation={props.onEditReservation}
                    onDeleteReservation={props.onDeleteReservation}
                    variant={props.variant}
                />
            )}
        </div>
    );
}
