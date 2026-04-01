import Button from "../components/Button.tsx";
import {safeBack} from "../util/Navigation.ts";
import {useNavigate} from "react-router-dom";
import type {CalendarData} from "../types.ts";
import dayjs, {type Dayjs} from "dayjs";
import {useMemo, useState} from "react";
import Calendar from "../components/calendar/Calendar.tsx";

// Parent-owned app settings plus callbacks to persist validated updates.
interface AppSettingProps extends CalendarData {
    firstDateToShow: "week" | "day";
    setFirstDateToShow: (firstDateToShow: "week" | "day") => void;
    setStartTime: (startTime: Dayjs) => void;
    setEndTime: (endTime: Dayjs) => void;
    setTimeStep: (timeStep: number) => void;
    setMaxResTime: (maxResTime: number) => void;
    setNumDays: (numDays: number) => void;
}

// Field keys used by validation and dynamic input styling.
type SettingField = "numDays" | "timeStep" | "maxResTime" | "startTime" | "endTime";
type FieldErrors = Partial<Record<SettingField, string>>;
// Parsed time is reused for both alignment checks and start/end comparisons.
type ParsedTime = {hour: number; minute: number; totalMinutes: number};
// Raw string state mirrors what users are typing into each input.
type SettingsInputs = {
    numDaysInput: string;
    timeStepInput: string;
    maxResTimeInput: string;
    startTimeInput: string;
    endTimeInput: string;
};
// Validation returns both errors and parsed values so valid fields can be applied immediately.
type ValidationResult = {
    errors: FieldErrors;
    parsedNumDays: number | null;
    parsedTimeStep: number | null;
    parsedMaxResTime: number | null;
    parsedStartTime: ParsedTime | null;
    parsedEndTime: ParsedTime | null;
    hasValidTimeStep: boolean;
};

// Shared Tailwind class fragments to keep form styles consistent.
const labelClassName = "mb-1 block text-sm font-semibold text-gray-700";
const helperTextClassName = "mt-1 text-xs text-gray-500";
const baseInputClassName = "w-full rounded border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1";

// Ensures hour/minute values render as HH:mm.
const formatTwoDigits = (value: number) => value.toString().padStart(2, "0");

// Accept only complete integer strings (no decimals and no partial parse).
const parseWholeNumber = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed || !/^-?\d+$/.test(trimmed)) {
        return null;
    }
    return Number(trimmed);
};

// Parse strict 24-hour HH:mm format and include total minutes for comparisons.
const parseTime = (raw: string): ParsedTime | null => {
    if (!/^\d{2}:\d{2}$/.test(raw)) {
        return null;
    }

    const [hour, minute] = raw.split(":").map(Number);
    if (
        Number.isNaN(hour) ||
        Number.isNaN(minute) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
    ) {
        return null;
    }

    return {
        hour,
        minute,
        totalMinutes: hour * 60 + minute,
    };
};

// Centralized validation for all settings, including cross-field constraints.
const validateSettings = (inputs: SettingsInputs): ValidationResult => {
    const parsedNumDays = parseWholeNumber(inputs.numDaysInput);
    const parsedTimeStep = parseWholeNumber(inputs.timeStepInput);
    const parsedMaxResTime = parseWholeNumber(inputs.maxResTimeInput);
    const parsedStartTime = parseTime(inputs.startTimeInput);
    const parsedEndTime = parseTime(inputs.endTimeInput);
    // Several rules depend on step size, so track validity once and reuse it.
    const hasValidTimeStep = parsedTimeStep !== null && parsedTimeStep > 0 && parsedTimeStep % 15 === 0;

    const errors: FieldErrors = {};

    if (parsedNumDays === null) {
        errors.numDays = "Enter a whole number of days.";
    } else if (parsedNumDays < 1 || parsedNumDays > 30) {
        errors.numDays = "Number of days must be between 1 and 30.";
    }

    if (parsedTimeStep === null) {
        errors.timeStep = "Enter a whole number for the time step.";
    } else if (parsedTimeStep <= 0 || parsedTimeStep % 15 !== 0) {
        errors.timeStep = "Time step must be a positive multiple of 15 minutes.";
    }

    if (parsedMaxResTime === null) {
        errors.maxResTime = "Enter a whole number for max reservation time.";
    } else if (parsedMaxResTime <= 0 || parsedMaxResTime % 15 !== 0) {
        errors.maxResTime = "Max reservation time must be a positive multiple of 15 minutes.";
    } else if (hasValidTimeStep && parsedMaxResTime < parsedTimeStep) {
        errors.maxResTime = "Max reservation time cannot be less than the time step.";
    }

    if (!parsedStartTime) {
        errors.startTime = "Select a valid start time.";
    } else if (hasValidTimeStep && parsedStartTime.minute % parsedTimeStep !== 0) {
        errors.startTime = `Start time minutes must align to ${parsedTimeStep}-minute intervals.`;
    }

    if (!parsedEndTime) {
        errors.endTime = "Select a valid end time.";
    } else if (hasValidTimeStep && parsedEndTime.minute % parsedTimeStep !== 0) {
        errors.endTime = `End time minutes must align to ${parsedTimeStep}-minute intervals.`;
    }

    if (parsedStartTime && parsedEndTime && parsedStartTime.totalMinutes >= parsedEndTime.totalMinutes) {
        errors.endTime = "End time must be later than start time.";
    }

    return {
        errors,
        parsedNumDays,
        parsedTimeStep,
        parsedMaxResTime,
        parsedStartTime,
        parsedEndTime,
        hasValidTimeStep,
    };
};

export default function AppSettings(props: AppSettingProps) {
    const navigate = useNavigate();

    const [loading,setLoading] = useState(false);

    // Keep editable input text local so users can type intermediate invalid values.
    const [firstDayInput, setFirstDayInput] =  useState<"week" | "day">(props.firstDateToShow);
    const [numDaysInput, setNumDaysInput] = useState(() => props.numDays.toString());
    const [timeStepInput, setTimeStepInput] = useState(() => props.timeStep.toString());
    const [maxResTimeInput, setMaxResTimeInput] = useState(() => props.maxResTime.toString());
    const [startTimeInput, setStartTimeInput] = useState(() => props.startTime.format("HH:mm"));
    const [endTimeInput, setEndTimeInput] = useState(() => props.endTime.format("HH:mm"));

    const saved = numDaysInput === props.numDays.toString() &&
        timeStepInput === props.timeStep.toString() &&
        maxResTimeInput === props.maxResTime.toString() &&
        startTimeInput === props.startTime.format("HH:mm") &&
        endTimeInput === props.endTime.format("HH:mm");

    // Re-run validation whenever any input value changes.
    const validation = useMemo(
        () =>
            validateSettings({
                numDaysInput,
                timeStepInput,
                maxResTimeInput,
                startTimeInput,
                endTimeInput,
            }),
        [numDaysInput, timeStepInput, maxResTimeInput, startTimeInput, endTimeInput]
    );

    const {errors, hasValidTimeStep, parsedTimeStep} = validation;

    // Deduplicate messages so the summary banner shows each issue once.
    const uniqueErrorMessages = useMemo(() => {
        return Array.from(new Set(Object.values(errors).filter((message): message is string => Boolean(message))));
    }, [errors]);

    const hasErrors = uniqueErrorMessages.length > 0;
    // HTML time input expects seconds for `step`; default to 15 minutes when invalid.
    const timeStepSeconds = hasValidTimeStep && parsedTimeStep ? parsedTimeStep * 60 : 900;

    // Highlight invalid fields while reusing the base input styling.
    const getInputClassName = (field: SettingField) =>
        `${baseInputClassName} ${
            errors[field]
                ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:border-primary focus:ring-primary/30"
        }`;

    // Push only valid, changed fields to parent state; invalid fields stay local.
    const applyValidSettings = (inputs: SettingsInputs) => {
        const next = validateSettings(inputs);

        props.setFirstDateToShow(firstDayInput);

        if (!next.errors.numDays && next.parsedNumDays !== null && next.parsedNumDays !== props.numDays) {
            props.setNumDays(next.parsedNumDays);
        }

        if (!next.errors.timeStep && next.parsedTimeStep !== null && next.parsedTimeStep !== props.timeStep) {
            props.setTimeStep(next.parsedTimeStep);
        }

        if (!next.errors.maxResTime && next.parsedMaxResTime !== null && next.parsedMaxResTime !== props.maxResTime) {
            props.setMaxResTime(next.parsedMaxResTime);
        }

        if (!next.errors.startTime && next.parsedStartTime) {
            const nextStart = `${formatTwoDigits(next.parsedStartTime.hour)}:${formatTwoDigits(next.parsedStartTime.minute)}`;
            if (nextStart !== props.startTime.format("HH:mm")) {
                // Preserve the existing date context and only replace the time portion.
                props.setStartTime(
                    props.startTime
                        .hour(next.parsedStartTime.hour)
                        .minute(next.parsedStartTime.minute)
                        .second(0)
                        .millisecond(0)
                );
            }
        }

        if (!next.errors.endTime && next.parsedEndTime) {
            const nextEnd = `${formatTwoDigits(next.parsedEndTime.hour)}:${formatTwoDigits(next.parsedEndTime.minute)}`;
            if (nextEnd !== props.endTime.format("HH:mm")) {
                // Preserve the existing date context and only replace the time portion.
                props.setEndTime(
                    props.endTime
                        .hour(next.parsedEndTime.hour)
                        .minute(next.parsedEndTime.minute)
                        .second(0)
                        .millisecond(0)
                );
            }
        }
    };

    return (
        <>
            <div className="flex flex-wrap gap-2">
                <Button text="Back" className="bg-gray-200 hover:bg-gray-100" onClick={() => safeBack(navigate)} />
            </div>
            <section className="mx-5 md:mx-30 space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">App Settings</h1>
                        <p className="text-sm text-gray-500">Update calendar range and reservation timing defaults.</p>
                    </div>
                </div>

                <div className="flex flex-col rounded border bg-white p-6 shadow-sm space-y-6">
                    {/* Summary banner reflects the current form validity in real time. */}
                    {hasErrors ? (
                        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3">
                            <p className="text-sm font-semibold text-amber-900">
                                Fix the highlighted fields. Invalid values are not applied.
                            </p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-900">
                                {uniqueErrorMessages.map((message) => (
                                    <li key={message}>{message}</li>
                                ))}
                            </ul>
                        </div>
                    ) : !saved && (
                        <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
                            All settings are valid. Press save to save your changes.
                        </div>
                    )}

                    <div className="grid gap-5 md:grid-cols-2">
                        {/* This option also resets firstDate so the visible range starts at the selected granularity. */}
                        <div>
                            <label className={labelClassName} htmlFor="first-date-to-show">First day to show</label>
                            <select
                                id="first-date-to-show"
                                className={`${baseInputClassName} border-gray-300 focus:border-primary focus:ring-primary/30`}
                                value={firstDayInput}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value !== "week" && value !== "day") {
                                        return;
                                    }
                                    setFirstDayInput(value);
                                }}
                            >
                                <option value="week">Sunday of current week</option>
                                <option value="day">Current day</option>
                            </select>
                            <p className={helperTextClassName}>Controls where the calendar window starts.</p>
                        </div>

                        {/* Numeric and time fields below validate continuously and apply once valid. */}
                        <div>
                            <label className={labelClassName} htmlFor="number-of-days">Number of days to show</label>
                            <input
                                id="number-of-days"
                                type="number"
                                min={1}
                                max={30}
                                step={1}
                                value={numDaysInput}
                                onChange={(event) => setNumDaysInput(event.target.value)}
                                className={getInputClassName("numDays")}
                                aria-invalid={Boolean(errors.numDays)}
                            />
                            {errors.numDays ? (
                                <p className="mt-1 text-xs font-semibold text-red-600">{errors.numDays}</p>
                            ) : (
                                <p className={helperTextClassName}>Allowed range: 1 to 30 days.</p>
                            )}
                        </div>

                        <div>
                            <label className={labelClassName} htmlFor="time-step">Time step (minutes)</label>
                            <input
                                id="time-step"
                                type="number"
                                min={15}
                                step={15}
                                value={timeStepInput}
                                onChange={(event) => setTimeStepInput(event.target.value)}
                                className={getInputClassName("timeStep")}
                                aria-invalid={Boolean(errors.timeStep)}
                            />
                            {errors.timeStep ? (
                                <p className="mt-1 text-xs font-semibold text-red-600">{errors.timeStep}</p>
                            ) : (
                                <p className={helperTextClassName}>Use 15-minute increments (15, 30, 45, 60...).</p>
                            )}
                        </div>

                        <div>
                            <label className={labelClassName} htmlFor="max-reservation-time">Max reservation time (minutes)</label>
                            <input
                                id="max-reservation-time"
                                type="number"
                                min={15}
                                step={15}
                                value={maxResTimeInput}
                                onChange={(event) => setMaxResTimeInput(event.target.value)}
                                className={getInputClassName("maxResTime")}
                                aria-invalid={Boolean(errors.maxResTime)}
                            />
                            {errors.maxResTime ? (
                                <p className="mt-1 text-xs font-semibold text-red-600">{errors.maxResTime}</p>
                            ) : (
                                <p className={helperTextClassName}>Must be greater than or equal to the time step.</p>
                            )}
                        </div>

                        <div>
                            <label className={labelClassName} htmlFor="start-time">Start time</label>
                            <input
                                id="start-time"
                                type="time"
                                step={timeStepSeconds}
                                value={startTimeInput}
                                onChange={(event) => setStartTimeInput(event.target.value)}
                                className={getInputClassName("startTime")}
                                aria-invalid={Boolean(errors.startTime)}
                            />
                            {errors.startTime ? (
                                <p className="mt-1 text-xs font-semibold text-red-600">{errors.startTime}</p>
                            ) : (
                                <p className={helperTextClassName}>Reservations cannot start earlier than this time.</p>
                            )}
                        </div>

                        <div>
                            <label className={labelClassName} htmlFor="end-time">End time</label>
                            <input
                                id="end-time"
                                type="time"
                                step={timeStepSeconds}
                                value={endTimeInput}
                                onChange={(event) => setEndTimeInput(event.target.value)}
                                className={getInputClassName("endTime")}
                                aria-invalid={Boolean(errors.endTime)}
                            />
                            {errors.endTime ? (
                                <p className="mt-1 text-xs font-semibold text-red-600">{errors.endTime}</p>
                            ) : (
                                <p className={helperTextClassName}>Reservations must end at or before this time.</p>
                            )}
                        </div>
                    </div>
                    <Button
                        text="Save Changes"
                        className="text-white font-bold bg-green-500 border-green-600
                        hover:bg-green-600 hover:border-green-700 w-fit self-center"
                        disabled={hasErrors}
                        onClick={() => applyValidSettings({
                            numDaysInput,
                            timeStepInput,
                            maxResTimeInput,
                            startTimeInput,
                            endTimeInput,
                        })}
                    />
                </div>

                <h2 className="text-2xl font-bold text-gray-900">Calendar Preview</h2>

                <Calendar
                    firstDate={dayjs().startOf(firstDayInput)}
                    numDays={validation.parsedNumDays ?? 7}
                    startTime={props.startTime
                        .hour(validation.parsedStartTime.hour)
                        .minute(validation.parsedStartTime.minute)
                        .second(0)
                        .millisecond(0)}
                    endTime={props.endTime
                        .hour(validation.parsedEndTime.hour)
                        .minute(validation.parsedEndTime.minute)
                        .second(0)
                        .millisecond(0)}
                    timeStepMin={validation.parsedTimeStep ?? 15}
                    variant={"trainer"} // TODO New variant?
                    loading={loading}

                />
            </section>
        </>
    );
}
