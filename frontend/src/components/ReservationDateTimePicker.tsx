import { useMemo } from "react";
import type {CalendarData, CalendarEvent} from "../types.ts";
import dayjs, {type Dayjs} from "dayjs";
import {buildTimeOptions, filterPastTimesForDate} from "../util/TimeOptions.ts";
import {formLabelClassName, selectInputClassName} from "../styles/formStyles.ts";

const filterConfiguredWindowTimes = (
    options: { value: string; label: string }[],
    hideConfiguredWindowTimes: boolean | undefined,
    standardWindowStartMinutes: number,
    standardWindowEndMinutes: number
) => {
    if (!hideConfiguredWindowTimes) {
        return options;
    }

    return options.filter((option) => {
        const [hour, minute] = option.value.split(":").map(Number);
        if (Number.isNaN(hour) || Number.isNaN(minute)) {
            return false;
        }

        const optionMinutes = hour * 60 + minute;
        return optionMinutes < standardWindowStartMinutes || optionMinutes > standardWindowEndMinutes;
    });
};

interface DateTimeRangePickerProps extends CalendarData {
    scheduleBlocks?: CalendarEvent[];
    allowWeekendDates?: boolean;
    allowPastDateTimes?: boolean;
    timeWindowStart?: Dayjs;
    timeWindowEnd?: Dayjs;
    hideConfiguredWindowTimes?: boolean;
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
    const todayKey = dayjs().format("YYYY-MM-DD");
    const weekendLockEnabled = props.disableWeekends ?? !props.allowWeekendDates;
    const effectiveStartTime = props.timeWindowStart ?? props.startTime;
    const effectiveEndTime = props.timeWindowEnd ?? props.endTime;
    const standardWindowStartMinutes = props.startTime.hour() * 60 + props.startTime.minute();
    const standardWindowEndMinutes = props.endTime.hour() * 60 + props.endTime.minute();

    const baseTimeOptions = useMemo(() => {
        return filterConfiguredWindowTimes(
            buildTimeOptions(effectiveStartTime, effectiveEndTime, props.timeStep),
            props.hideConfiguredWindowTimes,
            standardWindowStartMinutes,
            standardWindowEndMinutes
        );
    }, [effectiveEndTime, effectiveStartTime, props.hideConfiguredWindowTimes, props.timeStep, standardWindowEndMinutes, standardWindowStartMinutes]);
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
        const filterForDay = (options: { value: string; label: string }[]) =>
            props.allowPastDateTimes ? options : filterPastTimesForDate(options, selectedDay);

        const filteredBaseTimes = filterConfiguredWindowTimes(
            filterForDay(baseTimeOptions),
            props.hideConfiguredWindowTimes,
            standardWindowStartMinutes,
            standardWindowEndMinutes
        );

        if (!selectedDay) {
            return filteredBaseTimes;
        }

        const openWindowOptions = filterConfiguredWindowTimes(
            filterForDay(openWindowTimeOptionsByDate.get(selectedDay.format("YYYY-MM-DD")) ?? []),
            props.hideConfiguredWindowTimes,
            standardWindowStartMinutes,
            standardWindowEndMinutes
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
    }, [
        baseTimeOptions,
        openWindowTimeOptionsByDate,
        props.allowPastDateTimes,
        props.hideConfiguredWindowTimes,
        selectedDay,
        standardWindowEndMinutes,
        standardWindowStartMinutes,
        weekendLockEnabled
    ]);
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
        });
    }, [props.maxResTime, props.selectedStartTime, startTimeOptions]);

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
