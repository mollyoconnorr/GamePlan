import { useMemo } from "react";
import type {CalendarData} from "../types.ts";
import dayjs from "dayjs";
import {buildTimeOptions, filterPastTimesForDate} from "../util/TimeOptions.ts";
import {formLabelClassName, selectInputClassName} from "../styles/formStyles.ts";

interface DateTimeRangePickerProps extends CalendarData {
    // controlled values
    selectedDate: string;
    selectedStartTime: string;
    selectedEndTime: string;

    // setters
    setSelectedDate: (date: string) => void;
    setSelectedStartTime: (time: string) => void;
    setSelectedEndTime: (time: string) => void;
    disableWeekends?: boolean;
}

export default function DateTimeRangePicker(props: DateTimeRangePickerProps) {
    // Date options, from given start date + numDays
    const dateOptions = useMemo(() => {
        const today = dayjs();

        return Array.from({ length: props.numDays }, (_, i) => props.firstDate.add(i, "day"))
            .filter((dateOption) => !dateOption.isBefore(today, "day"))
            .filter((dateOption) => {
                if (!props.disableWeekends) {
                    return true;
                }

                const dayOfWeek = dateOption.day();
                return dayOfWeek !== 0 && dayOfWeek !== 6;
            })
            .map((dateOption) => ({
                value: dateOption.format("YYYY-MM-DD"),
                label: dateOption.format("ddd M/D/YY"),
            }));
    }, [props.firstDate, props.numDays, props.disableWeekends]);

    // Create time options (between startTime and endTime)
    const timeOptions = useMemo(() => {
        return buildTimeOptions(props.startTime, props.endTime, props.timeStep);
    }, [props.startTime, props.endTime,props.timeStep]);

    const selectedDay = useMemo(() => {
        if (!props.selectedDate) {
            return null;
        }

        const parsed = dayjs(props.selectedDate);
        return parsed.isValid() ? parsed : null;
    }, [props.selectedDate]);

    const startTimeOptions = useMemo(() => {
        return filterPastTimesForDate(timeOptions, selectedDay);
    }, [timeOptions, selectedDay]);
    const noStartTimesAvailable = Boolean(props.selectedDate) && startTimeOptions.length === 0;

    const toMinutes = (time: string) => {
        const [h, m] = time.split(":").map(Number);
        return h * 60 + m;
    };

    // Filter selectedEndTime options to only include those after selectedStartTime
    const endTimeOptions = useMemo(() => {
        if (!props.selectedStartTime) return [];

        const start = toMinutes(props.selectedStartTime);

        return startTimeOptions.filter((t) => {
            const val = toMinutes(t.value);
            return val > start && val <= start + props.maxResTime;
        });    }, [props.selectedStartTime, startTimeOptions, props.maxResTime]);

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {/* Date Setter */}
            <div>
                <label className={formLabelClassName} htmlFor="reservation-date">Date</label>
                <select
                    id="reservation-date"
                    value={props.selectedDate}
                    onChange={(e) => {
                        props.setSelectedDate(e.target.value);
                        props.setSelectedStartTime("");
                        props.setSelectedEndTime("");
                    }}
                    className={selectInputClassName}
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
            <div>
                <label className={formLabelClassName} htmlFor="reservation-start-time">Start time</label>

                <select
                    id="reservation-start-time"
                    value={props.selectedStartTime}
                    onChange={(e) => {
                        props.setSelectedStartTime(e.target.value);
                        props.setSelectedEndTime("");
                    }}
                    disabled={!props.selectedDate}
                    className={selectInputClassName}
                >
                    <option value="">Select start time</option>
                    {startTimeOptions.map((t) => (
                        <option key={t.value} value={t.value}>
                            {t.label}
                        </option>
                    ))}
                </select>

                {noStartTimesAvailable && (
                    <p className="mt-1 text-xs font-semibold text-red-600">
                        No available start times for this date. Select a different date.
                    </p>
                )}
            </div>

            {/*End time setter */}
            <div>
                <label className={formLabelClassName} htmlFor="reservation-end-time">End time</label>
                <select
                    id="reservation-end-time"
                    value={props.selectedEndTime}
                    onChange={(e) => props.setSelectedEndTime(e.target.value)}
                    disabled={!props.selectedStartTime}
                    className={selectInputClassName}
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
