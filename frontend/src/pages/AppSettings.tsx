import Button from "../components/Button.tsx";
import {safeBack} from "../util/Navigation.ts";
import {useNavigate} from "react-router-dom";
import type {CalendarData, CalendarEvent, ParsedTime} from "../types.ts";
import dayjs, {type Dayjs} from "dayjs";
import {useEffect, useMemo, useState} from "react";
import Calendar from "../components/calendar/Calendar.tsx";
import {parseTime, parseWholeNumber} from "../util/Time.ts";
import {type ParsedAppSettingsData, updateAppSettings} from "../api/Settings.ts";
import Spinner from "../components/Spinner.tsx";
import ReservationDateTimePicker from "../components/ReservationDateTimePicker.tsx";
import Toast from "../components/Toast.tsx";
import {
    createScheduleBlock,
    deleteScheduleBlock,
    getScheduleBlocks
} from "../api/Blocks.ts";
import {parseRawBlockToEvent, sortEventsByStartIso} from "../util/ParseScheduleBlock.ts";

// Parent-owned app settings plus callbacks to persist validated updates.
interface AppSettingProps extends CalendarData {
    firstDateToShow: "week" | "day";
    setFirstDateToShow: (firstDateToShow: "week" | "day") => void;
    setStartTime: (startTime: Dayjs) => void;
    setEndTime: (endTime: Dayjs) => void;
    setTimeStep: (timeStep: number) => void;
    setMaxResTime: (maxResTime: number) => void;
    setNumDays: (numDays: number) => void;
    loading: boolean;
}

// Field keys used by validation and dynamic input styling.
type SettingField = "numDays" | "timeStep" | "maxResTime" | "startTime" | "endTime";
type FieldErrors = Partial<Record<SettingField, string>>;

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

    // Keep editable input text local so users can type intermediate invalid values.
    const [firstDayInput, setFirstDayInput] =  useState<"week" | "day">(props.firstDateToShow);
    const [numDaysInput, setNumDaysInput] = useState(() => props.numDays.toString());
    const [timeStepInput, setTimeStepInput] = useState(() => props.timeStep.toString());
    const [maxResTimeInput, setMaxResTimeInput] = useState(() => props.maxResTime.toString());
    const [startTimeInput, setStartTimeInput] = useState(() => props.startTime.format("HH:mm"));
    const [endTimeInput, setEndTimeInput] = useState(() => props.endTime.format("HH:mm"));

    const saved = firstDayInput === props.firstDateToShow &&
        numDaysInput === props.numDays.toString() &&
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
    // Calendar preview always uses a valid value: current draft when valid, otherwise persisted setting.
    const previewFirstDate = useMemo(() => dayjs().startOf(firstDayInput), [firstDayInput]);
    const previewNumDays = validation.parsedNumDays ?? props.numDays;
    const previewTimeStep = validation.parsedTimeStep ?? props.timeStep;

    // Build preview start/end times from valid draft fields so block picker stays in sync with settings edits.
    const previewStartTime = useMemo(() => {
        if (!validation.parsedStartTime) {
            return props.startTime;
        }

        return props.startTime
            .hour(validation.parsedStartTime.hour)
            .minute(validation.parsedStartTime.minute)
            .second(0)
            .millisecond(0);
    }, [props.startTime, validation.parsedStartTime]);

    const previewEndTime = useMemo(() => {
        if (!validation.parsedEndTime) {
            return props.endTime;
        }

        return props.endTime
            .hour(validation.parsedEndTime.hour)
            .minute(validation.parsedEndTime.minute)
            .second(0)
            .millisecond(0);
    }, [props.endTime, validation.parsedEndTime]);

    // Allow block picker to span the full daily window while still respecting the configured step.
    const blockMaxDuration = Math.max(
        previewTimeStep,
        previewEndTime.diff(previewStartTime, "minute")
    );

    // Block-creation form state (frontend controlled, persisted through /api/blocks).
    const [selectedBlockDate, setSelectedBlockDate] = useState("");
    const [selectedBlockStartTime, setSelectedBlockStartTime] = useState("");
    const [selectedBlockEndTime, setSelectedBlockEndTime] = useState("");
    const [blockReasonInput, setBlockReasonInput] = useState("");
    const [blockedSlots, setBlockedSlots] = useState<CalendarEvent[]>([]);
    const [blocksLoading, setBlocksLoading] = useState(false);
    const [isSavingBlock, setIsSavingBlock] = useState(false);
    const [blockErrorMessage, setBlockErrorMessage] = useState("");
    const [blockToastMessage, setBlockToastMessage] = useState("");

    const pendingBlockStart = selectedBlockDate && selectedBlockStartTime
        ? dayjs(`${selectedBlockDate} ${selectedBlockStartTime}`, "YYYY-MM-DD HH:mm")
        : null;
    const pendingBlockEnd = selectedBlockDate && selectedBlockEndTime
        ? dayjs(`${selectedBlockDate} ${selectedBlockEndTime}`, "YYYY-MM-DD HH:mm")
        : null;

    // Prevent creating overlapping blocks in the current dataset before calling the API.
    const pendingBlockConflict = useMemo(() => {
        if (!pendingBlockStart || !pendingBlockEnd) {
            return false;
        }

        return blockedSlots.some((slot) => {
            if (!slot.startIso || !slot.endIso) {
                return false;
            }

            const slotStart = dayjs(slot.startIso);
            const slotEnd = dayjs(slot.endIso);
            return pendingBlockStart.isBefore(slotEnd) && slotStart.isBefore(pendingBlockEnd);
        });
    }, [pendingBlockEnd, pendingBlockStart, blockedSlots]);

    // Temporary event used only for live calendar preview before the block is saved.
    const pendingBlock = pendingBlockStart && pendingBlockEnd
        ? {
            id: 0,
            name: "Pending block",
            date: pendingBlockStart.format("ddd M/D"),
            startTime: pendingBlockStart.format("h:mm A"),
            endTime: pendingBlockEnd.format("h:mm A"),
            description: blockReasonInput.trim() || "Not added yet",
            temp: true,
            startIso: pendingBlockStart.toISOString(),
            endIso: pendingBlockEnd.toISOString(),
            color: pendingBlockConflict ? "#dc2626" : "#2563eb",
            borderColor: pendingBlockConflict ? "#991b1b" : "#1d4ed8",
            textColor: "#ffffff",
            conflict: pendingBlockConflict,
        } satisfies CalendarEvent
        : null;

    // Show persisted blocks plus the unsaved preview block in one calendar feed.
    const blockedSlotsWithPreview = [
        ...blockedSlots,
        ...(pendingBlock ? [pendingBlock] : []),
    ];

    // Disable creation until selection is complete and we are not in a conflicting/loading state.
    const addBlockDisabled =
        !pendingBlockStart ||
        !pendingBlockEnd ||
        pendingBlockConflict ||
        isSavingBlock ||
        blocksLoading;

    // Keep toast auto-dismiss behavior consistent with the rest of the app.
    useEffect(() => {
        if (!blockToastMessage) return;
        const timeout = setTimeout(() => setBlockToastMessage(""), 2500);
        return () => clearTimeout(timeout);
    }, [blockToastMessage]);

    useEffect(() => {
        let cancelled = false;

        // Hydrate the page with existing persisted blocks on first load.
        const loadBlocks = async () => {
            setBlocksLoading(true);
            setBlockErrorMessage("");

            try {
                const data = await getScheduleBlocks();
                if (cancelled) {
                    return;
                }

                setBlockedSlots(sortEventsByStartIso(data.map(parseRawBlockToEvent)));
            } catch (err) {
                if (cancelled) {
                    return;
                }

                const message = err instanceof Error ? err.message : "Failed to load existing blocks.";
                setBlockErrorMessage(message);
            } finally {
                if (!cancelled) {
                    setBlocksLoading(false);
                }
            }
        };

        void loadBlocks();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleAddBlock = async () => {
        if (addBlockDisabled || !pendingBlockStart || !pendingBlockEnd) {
            return;
        }

        // Save the block first; optimistic insertion is intentionally avoided so
        // canceled-reservation counts and any server validations stay authoritative.
        setIsSavingBlock(true);
        setBlockErrorMessage("");

        try {
            const createdBlock = await createScheduleBlock({
                start: pendingBlockStart.toISOString(),
                end: pendingBlockEnd.toISOString(),
                reason: blockReasonInput.trim() || undefined,
            });

            const canceledReservations = createdBlock.canceledReservations ?? 0;
            const suffix = canceledReservations === 1 ? "" : "s";
            const canceledMessage = canceledReservations > 0
                ? ` ${canceledReservations} reservation${suffix} canceled.`
                : "";

            setBlockedSlots((previous) => sortEventsByStartIso([...previous, parseRawBlockToEvent(createdBlock)]));
            setBlockToastMessage(`Block added.${canceledMessage}`);

            setSelectedBlockDate("");
            setSelectedBlockStartTime("");
            setSelectedBlockEndTime("");
            setBlockReasonInput("");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to add block.";
            setBlockErrorMessage(message);
        } finally {
            setIsSavingBlock(false);
        }
    };

    const handleDeleteBlock = async (id: number) => {
        // Pending preview blocks are local-only and should never hit DELETE API.
        if (id <= 0) {
            return;
        }

        setBlockErrorMessage("");

        try {
            await deleteScheduleBlock(id);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to remove block.";
            setBlockErrorMessage(message);
            throw err;
        }

        setBlockedSlots((previous) => previous.filter((slot) => slot.id !== id));
        setBlockToastMessage("Block removed.");
    };

    // Highlight invalid fields while reusing the base input styling.
    const getInputClassName = (field: SettingField) =>
        `${baseInputClassName} ${
            errors[field]
                ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:border-primary focus:ring-primary/30"
        }`;

    // Push only valid, changed fields to parent state; invalid fields stay local.
    const applyValidSettings = async (inputs: SettingsInputs) => {
        const next = validateSettings(inputs);

        const hasErrors = Object.values(next.errors).some(Boolean);
        if (hasErrors) {
            return;
        }

        let updated: ParsedAppSettingsData;
        try {
            updated = await updateAppSettings({
                ...inputs,
                firstDateToShow: firstDayInput,
            });
        } catch (err) {
            console.error("Failed to update app settings:", err);
            return;
        }

        props.setFirstDateToShow(updated.firstDateToShow);
        props.setNumDays(updated.numDays);
        props.setTimeStep(updated.timeStep);
        props.setMaxResTime(updated.maxResTime);
        props.setStartTime(updated.startTime);
        props.setEndTime(updated.endTime);
    };

    return (
        <>
            <Toast message={blockToastMessage} />
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

                {props.loading && <Spinner/>}
                {!props.loading && <div className="flex flex-col rounded border bg-white p-6 shadow-sm space-y-6">
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
                        <div
                            className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
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
                            <label className={labelClassName} htmlFor="max-reservation-time">Max reservation time
                                (minutes)</label>
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
                </div>}

                <div className="rounded border bg-white p-6 shadow-sm space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900">Block Time Slots</h2>
                    <p className="text-sm text-gray-500">
                        Add persisted block events to mark unavailable windows.
                    </p>

                    <ReservationDateTimePicker
                        firstDate={previewFirstDate}
                        numDays={previewNumDays}
                        startTime={previewStartTime}
                        timeStep={previewTimeStep}
                        endTime={previewEndTime}
                        maxResTime={blockMaxDuration}
                        selectedDate={selectedBlockDate}
                        selectedStartTime={selectedBlockStartTime}
                        selectedEndTime={selectedBlockEndTime}
                        setSelectedDate={setSelectedBlockDate}
                        setSelectedStartTime={setSelectedBlockStartTime}
                        setSelectedEndTime={setSelectedBlockEndTime}
                    />

                    <div className="max-w-xl">
                        <label className={labelClassName} htmlFor="block-reason">
                            Block reason (optional)
                        </label>
                        <input
                            id="block-reason"
                            type="text"
                            value={blockReasonInput}
                            onChange={(event) => setBlockReasonInput(event.target.value)}
                            placeholder="Example: Team lift, facility event, maintenance window"
                            className={`${baseInputClassName} border-gray-300 focus:border-primary focus:ring-primary/30`}
                        />
                        <p className={helperTextClassName}>
                            This note appears on the calendar when someone opens the blocked time slot.
                        </p>
                    </div>

                    {pendingBlockConflict && (
                        <p className="text-sm font-semibold text-red-600">
                            This block overlaps an existing block on the preview calendar.
                        </p>
                    )}
                    {blockErrorMessage && (
                        <p className="text-sm font-semibold text-red-600">{blockErrorMessage}</p>
                    )}

                    <Button
                        text={isSavingBlock ? "Adding..." : "Add Block"}
                        className="text-white font-bold bg-slate-800 border-slate-900 hover:bg-slate-700 hover:border-slate-800 w-fit"
                        onClick={handleAddBlock}
                        disabled={addBlockDisabled}
                    />
                </div>

                <h2 className="text-2xl font-bold text-gray-900">Calendar Preview</h2>

                <Calendar
                    firstDate={previewFirstDate}
                    numDays={previewNumDays}
                    startTime={previewStartTime}
                    endTime={previewEndTime}
                    timeStepMin={previewTimeStep}
                    variant={"trainer"}
                    reservations={blockedSlotsWithPreview}
                    onDeleteReservation={handleDeleteBlock}
                    loading={props.loading || blocksLoading}
                />
            </section>
        </>
    );
}
