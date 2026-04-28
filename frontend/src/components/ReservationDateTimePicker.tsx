import { useMemo } from "react";
import type {CalendarData, CalendarEvent} from "../types.ts";
import dayjs, {type Dayjs} from "dayjs";
import {buildTimeOptions, filterPastTimesForDate} from "../util/TimeOptions.ts";
import {formLabelClassName, selectInputClassName} from "../styles/formStyles.ts";

/**
 * Defines the props required by the DateTimeRangePicker component.
 */
interface DateTimeRangePickerProps extends CalendarData {
    scheduleBlocks?: CalendarEvent[];
    allowWeekendDates?: boolean;
    allowPastDateTimes?: boolean;
    timeWindowStart?: Dayjs;
    timeWindowEnd?: Dayjs;
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

/**
 * Renders the DateTimeRangePicker view.
 */
export default function DateTimeRangePicker(props: DateTimeRangePickerProps) {
    // Date options, from given start date + numDays
    const todayKey = dayjs().format("YYYY-MM-DD");
    const weekendLockEnabled = props.disableWeekends ?? !props.allowWeekendDates;
    const effectiveStartTime = props.timeWindowStart ?? props.startTime;
    const effectiveEndTime = props.timeWindowEnd ?? props.endTime;
    const baseTimeOptions = useMemo(() => {
        return buildTimeOptions(effectiveStartTime, effectiveEndTime, props.timeStep);
    }, [effectiveEndTime, effectiveStartTime, props.timeStep]);
    const dateOptions = useMemo(() => {
        const today = dayjs(todayKey, "YYYY-MM-DD", true);

        return Array.from({ length: props.numDays }, (_, i) => props.firstDate.add(i, "day"))
            .filter((dateOption) => props.allowPastDateTimes || !dateOption.isBefore(today, "day"))
            .map((dateOption) => ({
                isWeekend: dateOption.day() === 0 || dateOption.day() === 6,
                hasOpenWindow: props.scheduleBlocks?.some((block) => {
                    if ((block.blockType ?? "BLOCK").toUpperCase() !== "OPEN" || !block.startIso || !block.endIso) {
                        return false;
                    }

                    const blockStart = dayjs(block.startIso);
                    const blockEnd = dayjs(block.endIso);
                    return blockStart.format("YYYY-MM-DD") === dateOption.format("YYYY-MM-DD") &&
                        blockEnd.isAfter(blockStart);
                }) ?? false,
                value: dateOption.format("YYYY-MM-DD"),
                label: dateOption.format("ddd M/D/YY"),
            }));
    }, [props.allowPastDateTimes, props.firstDate, props.numDays, props.scheduleBlocks, todayKey]);

    // Index OPEN blocks by date so weekend-only windows can still be selectable.
    const openWindowTimeOptionsByDate = useMemo(() => {
        const map = new Map<string, { value: string; label: string }[]>();

        (props.scheduleBlocks ?? []).forEach((block) => {
            if ((block.blockType ?? "BLOCK").toUpperCase() !== "OPEN" || !block.startIso || !block.endIso) {
                return;
            }

            const blockDate = dayjs(block.startIso).format("YYYY-MM-DD");
            const options = buildTimeOptions(dayjs(block.startIso), dayjs(block.endIso), props.timeStep);
            const existing = map.get(blockDate) ?? [];
            map.set(blockDate, [...existing, ...options]);
        });

        return map;
    }, [props.scheduleBlocks, props.timeStep]);

    const normalizedDateOptions = useMemo(() => {
        return dateOptions.map((option) => {
            const enabled = !weekendLockEnabled || !option.isWeekend || option.hasOpenWindow;
            return {
                ...option,
                disabled: !enabled,
                label: option.isWeekend && !enabled ? `${option.label} (blocked)` : option.label,
            };
        });
    }, [dateOptions, weekendLockEnabled]);

    const selectedDay = useMemo(() => {
        if (!props.selectedDate) {
            return null;
        }

        const parsed = dayjs(props.selectedDate);
        return parsed.isValid() ? parsed : null;
    }, [props.selectedDate]);

    // Merges base day options with OPEN windows and enforces weekend locking rules.
    const startTimeOptions = useMemo(() => {
        /**
         * Filters unavailable calendar events down to the selected day for time picker validation.
         */
        const filterForDay = (options: { value: string; label: string }[]) =>
            props.allowPastDateTimes ? options : filterPastTimesForDate(options, selectedDay);

        const filteredBaseTimes = filterForDay(baseTimeOptions);

        if (!selectedDay) {
            return filteredBaseTimes;
        }

        const openWindowOptions = filterForDay(
            openWindowTimeOptionsByDate.get(selectedDay.format("YYYY-MM-DD")) ?? []
        );

        const isWeekend = selectedDay.day() === 0 || selectedDay.day() === 6;
        if (isWeekend) {
            if (!weekendLockEnabled) {
                return filteredBaseTimes;
            }

            if (openWindowOptions.length === 0) {
                return [];
            }

            return openWindowOptions;
        }

        if (openWindowOptions.length === 0) {
            return filteredBaseTimes;
        }

        const merged = new Map<string, { value: string; label: string }>();
        [...filteredBaseTimes, ...openWindowOptions].forEach((option) => {
            merged.set(option.value, option);
        });

        return Array.from(merged.values()).sort((a, b) => a.value.localeCompare(b.value));
    }, [baseTimeOptions, openWindowTimeOptionsByDate, props.allowPastDateTimes, selectedDay, weekendLockEnabled]);
    const noStartTimesAvailable = Boolean(props.selectedDate) && startTimeOptions.length === 0;

    /**
     * Converts a date-time value into minutes since midnight for picker comparisons.
     */
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
                    {normalizedDateOptions.map((d) => (
                        <option key={d.value} value={d.value} disabled={d.disabled}>
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
