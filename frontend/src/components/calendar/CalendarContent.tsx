import type {CalendarContentProps} from "./CalendarTypes.ts";
import {type JSX} from "react";
import type {CalendarEvent} from "../../types.ts";
import dayjs from "dayjs";
import CalendarCard from "./CalendarCard.tsx";

export default function CalendarContent(props: CalendarContentProps) {
    const cardMargin: number = 2;

    // Map column / day indexes to events to render in those columns
    const dayEventMap: Map<number, CalendarEvent[]> = new Map();

    // Add events to their respective columns
    props.events.forEach((e) => {
        // Column index (Each column is one day)
        const colIndex = props.dayMap.get(e.date);

        if (colIndex === undefined) {
            return null;
        }

        if (!dayEventMap.has(colIndex)) {
            dayEventMap.set(colIndex, []);
        }

        // Add event to the days array
        dayEventMap.get(colIndex)!.push(e);
    });

    // Holds event HTML
    const dayEventMapHTML: Map<number, JSX.Element[]> = new Map();

    dayEventMap.forEach((dayEvents, key) => {
        // Sort events earliest to latest (Arbitrary date needed for converting to dayjs obj)
        dayEvents.sort((a, b) =>
            dayjs(`1970-01-01 ${a.endTime}`, "YYYY-MM-DD h:mm A").valueOf() -
            dayjs(`1970-01-01 ${b.endTime}`, "YYYY-MM-DD h:mm A").valueOf()
        );

        // Group events into groups that contain overlapping events
        let i = 0;
        while (i < dayEvents.length) {
            const overlapping: CalendarEvent[] = []
            overlapping.push(dayEvents[i]);

            // While event (i) endTime overlaps next events (i+1) startTime
            while (i < dayEvents.length - 1 && dayjs(`1970-01-01 ${dayEvents[i].endTime}`, "YYYY-MM-DD h:mm A").valueOf() > dayjs(`1970-01-01 ${dayEvents[i + 1].startTime}`, "YYYY-MM-DD h:mm A").valueOf()) {
                overlapping.push(dayEvents[i + 1]);
                i++;
            }
            i++;

            if (!dayEventMapHTML.has(key)) {
                dayEventMapHTML.set(key, []);
            }

            // Precompute the events starting and ending index
            // So we can compute the proper bounds for its container
            const indexedEvents = overlapping
                .map((e) => {
                    const startIndex = props.timeMap.get(e.startTime);
                    const endIndex = props.timeMap.get(e.endTime);

                    if (startIndex === undefined || endIndex === undefined) {
                        return null;
                    }

                    return {
                        event: e,
                        startIndex,
                        endIndex,
                    };
                })
                // Filter for non-null
                .filter((e): e is {
                    event: CalendarEvent;
                    startIndex: number;
                    endIndex: number;
                } => e !== null);

            if (indexedEvents.length === 0) {
                continue;
            }

            // Start and end index of group / container
            const groupStartIndex = Math.min(...indexedEvents.map((e) => e.startIndex));
            const groupEndIndex = Math.max(...indexedEvents.map((e) => e.endIndex));

            // Push group to days array (Key is col index, each col represents a day)
            dayEventMapHTML.get(key)!.push(
                <div
                    className="absolute flex flex-row justify-between space-x-1 mx-1"
                    style={{
                        top: props.cellHeight * groupStartIndex,
                        height: props.cellHeight * (groupEndIndex - groupStartIndex),
                        left: 0,
                        right: 0,
                    }}
                >
                    {overlapping.map((e) => {
                        // Time index
                        const startIndex = props.timeMap.get(e.startTime);
                        const endIndex = props.timeMap.get(e.endTime);

                        if (startIndex === undefined || endIndex === undefined) {
                            return null;
                        }

                        // Day card
                        return <CalendarCard
                            key={e.name + e.date + e.startTime}
                            event={e}
                            startIndex={startIndex}
                            endIndex={endIndex}
                            groupStartIndex={groupStartIndex}
                            cellHeight={props.cellHeight}
                            cardMargin={cardMargin}
                            onDeleteReservation={props.onDeleteReservation}
                        />
                    })}
                </div>);
        }
    })

    return (
        <div className="absolute z-6 h-full flex justify-between"
             style={{
                 top: props.top,
                 left: props.left,
                 height: `${props.height}px`,
                 width: `${props.width}px`,
                 maxWidth: `${props.width}px`,
             }
             }
        >
            {/*The # of keys in dayEventMap == props.numDays, so loop through num days to
            render each days events
            */}
            {Array.from({length: props.numDays}).map((_, i) => (
                <div key={i} className="w-full px-1 relative"
                     style={{ height: props.cellHeight * 36 }}>
                    {dayEventMapHTML.get(i)}
                </div>
            ))}

        </div>
    );
}