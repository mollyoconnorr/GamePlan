import { useMemo } from "react";
import type {CalendarData} from "../types.ts";

interface DateTimeRangePickerProps extends CalendarData {
    // controlled values
    selectedDate: string;
    selectedStartTime: string;
    selectedEndTime: string;

    // setters
    setSelectedDate: (date: string) => void;
    setSelectedStartTime: (time: string) => void;
    setSelectedEndTime: (time: string) => void;
}

export default function DateTimeRangePicker(props: DateTimeRangePickerProps) {
    // Date options, from given start date + numDays
    const dateOptions = useMemo(() => {
        return Array.from({ length: props.numDays }, (_, i) => {
            const d = props.firstDate.add(i, "day");
            return {
                value: d.format("YYYY-MM-DD"),
                label: d.format("ddd M/D/YY"),
            };
        });
    }, [props.firstDate, props.numDays]);

    // Create time options (between startTime and endTime)
    const timeOptions = useMemo(() => {
        const options: { value: string; label: string }[] = [];
        let current = props.startTime;

        while (current.isBefore(props.endTime) || current.isSame(props.endTime)) {
            options.push({
                value: current.format("HH:mm"),
                label: current.format("h:mm A"),
            });
            current = current.add(props.timeStep, "minute");
        }

        return options;
    }, [props.startTime, props.endTime,props.timeStep]);

    const toMinutes = (time: string) => {
        const [h, m] = time.split(":").map(Number);
        return h * 60 + m;
    };

    // Filter selectedEndTime options to only include those after selectedStartTime
    const endTimeOptions = useMemo(() => {
        if (!props.selectedStartTime) return [];

        const start = toMinutes(props.selectedStartTime);

        return timeOptions.filter((t) => {
            const val = toMinutes(t.value);
            return val > start && val <= start + props.maxResTime;
        });    }, [props.selectedStartTime, timeOptions, props.maxResTime]);

    return (
        <div className="flex flex-col md:flex-row space-x-10 space-y-10">
            {/* Date Setter */}
            <div className="flex flex-col gap-1">
                <label className="font-medium text-md lg:text-lg">Date</label>
                <select
                    value={props.selectedDate}
                    onChange={(e) => {
                        props.setSelectedDate(e.target.value);
                        props.setSelectedStartTime("");
                        props.setSelectedEndTime("");
                    }}
                    className="border rounded px-3 py-2 bg-white max-w-fit"
                >
                    <option value="">Select date</option>
                    {dateOptions.map((d) => (
                        <option key={d.value} value={d.value}>
                            {d.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Start time setter */}
            <div className="flex flex-col gap-1">
                <label className="font-medium text-md lg:text-lg">Start time</label>
                <select
                    value={props.selectedStartTime}
                    onChange={(e) => {
                        props.setSelectedStartTime(e.target.value);
                        props.setSelectedEndTime("");
                    }}
                    disabled={!props.selectedDate}
                    className="border rounded px-3 py-2 bg-white disabled:bg-gray-100 disabled:text-gray-400 max-w-fit"
                >
                    <option value="">Select start time</option>
                    {timeOptions.map((t) => (
                        <option key={t.value} value={t.value}>
                            {t.label}
                        </option>
                    ))}
                </select>
            </div>

            {/*End time setter */}
            <div className="flex flex-col gap-1">
                <label className="font-medium text-md lg:text-lg">End time</label>
                <select
                    value={props.selectedEndTime}
                    onChange={(e) => props.setSelectedEndTime(e.target.value)}
                    disabled={!props.selectedStartTime}
                    className="border rounded px-3 py-2 bg-white disabled:bg-gray-100 disabled:text-gray-400 max-w-fit"
                >
                    <option value="">Select end time</option>
                    {endTimeOptions.map((t) => (
                        <option key={t.value} value={t.value}>
                            {t.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}