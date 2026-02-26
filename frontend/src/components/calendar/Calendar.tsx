import type {CalendarProps} from "./CalendarTypes.ts";
import {type JSX, useEffect, useRef, useState} from "react";
import CalendarContent from "./CalendarContent.tsx";
import type {CalendarEvent} from "../../types.ts";
import {getReservations} from "../../api/Reservations.ts";
import {parseRawResToEvent} from "../../util/ParseReservation.ts";
import Spinner from "../Spinner.tsx";

export default function Calendar(props: CalendarProps) {
    const [reservations, setReservations] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);

    // TODO error handling
    useEffect(() => {
        const load = async () => {
            try {
                const data = await getReservations();
                console.log(data);
                setReservations(data.map(parseRawResToEvent));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const TIME_W = 90;
    const CELL_H = 40;
    const DAY_MIN_W = 140;

    const numRows =
        props.endTime.diff(props.startTime, "minute") / props.timeStepMin;

    // Total minimum width that forces horizontal scrolling if container is smaller
    const minWidth = TIME_W + props.numDays * DAY_MIN_W;

    // Use the same grid definition for header and body so columns align
    const gridStyle: React.CSSProperties = {
        gridTemplateColumns: `${TIME_W}px repeat(${props.numDays}, minmax(${DAY_MIN_W}px, 1fr))`,
        minWidth,
    };

    // Create day headers (Shows date on top row of calendar)
    const dayHTML: JSX.Element[] = [];

    // This is passed to calendar content to determine what column to place events in
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

    // Creates the time column on the left side of the calendar
    const timeColHTML: JSX.Element[] = [];

    // This is passed to calendar content to determine the size of each event
    const timeMap: Map<string, number> = new Map();
    for (let i = 0; i <= numRows; i++) {
        const currTime: string =  props.startTime
            .add(i * props.timeStepMin, "minute").format("h:mm A");

        timeColHTML.push(
            <div
                key={i}
                className="border-y text-center p-2"
                style={{ width: TIME_W, height: CELL_H }}
            >
                {currTime}
            </div>
        );

        timeMap.set(currTime, i);
    }

    // Used to dynamically update the size of the calendar cells based on the size of the calendar header row
    const divRef = useRef<HTMLDivElement | null>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!divRef.current) return;

        // Updates size everytime the size of the observed object changes
        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            setSize({ width, height });
        });

        observer.observe(divRef.current);

        return () => observer.disconnect();
    }, []);

    return (
        <div className="relative bg-gray-300 rounded-sm border shadow-md overflow-x-auto overflow-y-auto" >
            {/* BODY*/}
            <div className="max-h-[60vh]">
                {/* HEADER ROW */}
                {/* OBSERVER bc of ref*/}
                <div className="sticky top-0 z-20 grid bg-gray-400" style={gridStyle} ref={divRef}>
                    {/* top-left corner cell */}
                    <div className="p-2" />

                    {/* day headers */}
                    {dayHTML}
                </div>

                <div className="grid" style={gridStyle}>
                    {/* TIME COLUMN */}
                    <div className="flex flex-col bg-gray-400 z-11">
                        {timeColHTML}
                    </div>

                    {/* DAY COLUMNS */}
                    {Array.from({ length: props.numDays }).map((_, dayIdx) => (
                        <div key={dayIdx} className="border">
                            {/* CELLS */}
                            {Array.from({ length: numRows + 1 }).map((__, rowIdx) => (
                                <div key={rowIdx} className="border-b p-2"
                                     style={{ height: CELL_H }}
                                >

                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {loading && <Spinner/>}

            {/*Content on the calendar is rendered in this component*/}
            {!loading && props.variant === "user" && <CalendarContent
                top={CELL_H + 2}
                left={TIME_W + 1}
                height={CELL_H * (numRows + 1)}
                width={size.width - TIME_W}
                numDays={props.numDays}
                cellHeight={CELL_H}
                dayMap={dayMap}
                timeMap={timeMap}
                events={reservations}
            />}
        </div>
    );
}