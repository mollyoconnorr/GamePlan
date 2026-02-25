import type {CalendarContentProps} from "./CalendarTypes.ts";
import {type JSX} from "react";

export default function CalendarContent(props: CalendarContentProps) {
    // Map column / day indexes to events to render in those columns
    const dayEventMap: Map<number, JSX.Element[]> = new Map();

    // Add events to their respective columns
    props.events.forEach((e) => {
        // Time index
        const startIndex = props.timeMap.get(e.startTime);
        const endIndex = props.timeMap.get(e.endTime);

        // Column index (Each column is one day)
        const colIndex = props.dayMap.get(e.date);

        if (startIndex === undefined || endIndex === undefined || colIndex === undefined) {
            return null;
        }

        if (!dayEventMap.has(colIndex)) {
            dayEventMap.set(colIndex, []);
        }

        // Add JSX to the days array
        dayEventMap.get(colIndex)!.push(
            <p
                key={e.name}
                className="relative bg-blue-900 border-1 w-full break-all p-1 text-xs lg:text-md"
                style={{
                    top: props.cellHeight * startIndex,
                    height: props.cellHeight * (endIndex - startIndex),
                }}
            >
                {e.name}
            </p>
        );
    });

    return (
        <div className="absolute z-10  h-full opacity-60 flex justify-between"
             style={{top: props.top,
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
            {Array.from({length:props.numDays}).map((_, i) => (
                <div key={i} className="w-full px-1 flex flex-row space-x-2">
                    {dayEventMap.get(i)}
                </div>
            ))}

        </div>
    );
}