import type {CalendarProps} from "./CalendarTypes.ts";

export default function Calendar(props: CalendarProps) {
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

    return (
        <div className="relative bg-gray-300 rounded-sm border shadow-md overflow-x-auto">
            {/* BODY*/}
            <div className="max-h-[400px] overflow-y-auto">
                {/* HEADER ROW */}
                <div className="sticky top-0 z-20 grid bg-gray-400" style={gridStyle}>
                    {/* top-left corner cell */}
                    <div className="border p-2" />

                    {/* day headers */}
                    {Array.from({ length: props.numDays }).map((_, i) => (
                        <div key={i} className="border text-center p-2 font-semibold">
                            {props.firstDate.add(i, "days").format("ddd M/D")}
                        </div>
                    ))}
                </div>

                <div className="grid" style={gridStyle}>
                    {/* TIME COLUMN */}
                    <div className="sticky left-0 flex flex-col bg-gray-400 z-11">
                        {Array.from({ length: numRows + 1 }).map((_, i) => {
                            const disTime = props.startTime
                                .add(i * props.timeStepMin, "minute")
                                .format("h:mm A");

                            return (
                                <div
                                    key={i}
                                    className="border text-center p-2"
                                    style={{ width: TIME_W, height: CELL_H }}
                                >
                                    {disTime}
                                </div>
                            );
                        })}
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


        </div>
    );
}