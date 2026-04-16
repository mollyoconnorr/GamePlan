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
import ConfirmDialog from "../components/ConfirmDialog.tsx";
import {
    createScheduleBlock,
    deleteScheduleBlock,
    getScheduleBlocks,
    updateScheduleBlock
} from "../api/Blocks.ts";
import {parseRawBlockToEvent, sortEventsByStartIso} from "../util/ParseScheduleBlock.ts";
import {baseInputClassName, cardPanelClassName, formLabelClassName, selectInputClassName} from "../styles/formStyles.ts";
import {dispatchReservationDataChanged} from "../util/AppDataEvents.ts";

const WEEKEND_AUTO_BLOCK_REASON = "Weekend";

// Parent-owned app settings plus callbacks to persist validated updates.
interface AppSettingProps extends CalendarData {
    firstDateToShow: "week" | "day";
    setFirstDateToShow: (firstDateToShow: "week" | "day") => void;
    setFirstDate: (firstDate: Dayjs) => void;
    setStartTime: (startTime: Dayjs) => void;
    setEndTime: (endTime: Dayjs) => void;
    setTimeStep: (timeStep: number) => void;
    setMaxResTime: (maxResTime: number) => void;
    setNumDays: (numDays: number) => void;
    weekendAutoBlockEnabled: boolean;
    setWeekendAutoBlockEnabled: (enabled: boolean) => void;
    refreshCalendarData: () => Promise<void>;
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
const helperTextClassName = "mt-1 text-xs text-gray-500";

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

    const refreshMainCalendar = () => {
        void props.refreshCalendarData().catch((err) => {
            console.error("Failed to refresh main calendar data:", err);
        });
    };

    // Keep editable input text local so users can type intermediate invalid values.
    const [firstDayInput, setFirstDayInput] =  useState<"week" | "day">(props.firstDateToShow);
    const [numDaysInput, setNumDaysInput] = useState(() => props.numDays.toString());
    const [timeStepInput, setTimeStepInput] = useState(() => props.timeStep.toString());
    const [maxResTimeInput, setMaxResTimeInput] = useState(() => props.maxResTime.toString());
    const [startTimeInput, setStartTimeInput] = useState(() => props.startTime.format("HH:mm"));
    const [endTimeInput, setEndTimeInput] = useState(() => props.endTime.format("HH:mm"));

    // Keep local form inputs in sync with persisted settings loaded by parent.
    useEffect(() => {
        setFirstDayInput(props.firstDateToShow);
        setNumDaysInput(props.numDays.toString());
        setTimeStepInput(props.timeStep.toString());
        setMaxResTimeInput(props.maxResTime.toString());
        setStartTimeInput(props.startTime.format("HH:mm"));
        setEndTimeInput(props.endTime.format("HH:mm"));
    }, [
        props.firstDateToShow,
        props.numDays,
        props.timeStep,
        props.maxResTime,
        props.startTime,
        props.endTime,
    ]);

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

    const openWindowStartTime = useMemo(() => dayjs().startOf("day"), []);
    const openWindowEndTime = useMemo(() => dayjs().startOf("day").add(23, "hour").add(45, "minute"), []);

    // Allow block picker to span the full daily window while still respecting the configured step.
    const blockMaxDuration = Math.max(
        previewTimeStep,
        previewEndTime.diff(previewStartTime, "minute")
    );

    // Block-creation form state (frontend controlled, persisted through /api/blocks).
    const [selectedBlockDate, setSelectedBlockDate] = useState("");
    const [selectedBlockStartTime, setSelectedBlockStartTime] = useState("");
    const [selectedBlockEndTime, setSelectedBlockEndTime] = useState("");
    const [blockTypeInput, setBlockTypeInput] = useState<"BLOCK" | "OPEN">("BLOCK");
    const [blockReasonInput, setBlockReasonInput] = useState("");
    const [blockedSlots, setBlockedSlots] = useState<CalendarEvent[]>([]);
    const [editingBlockId, setEditingBlockId] = useState<number | null>(null);
    const [blocksLoading, setBlocksLoading] = useState(false);
    const [isSavingBlock, setIsSavingBlock] = useState(false);
    const [isTogglingWeekendBlocks, setIsTogglingWeekendBlocks] = useState(false);
    const [blockErrorMessage, setBlockErrorMessage] = useState("");
    const [toastMessage, setToastMessage] = useState("");
    const [blockToDelete, setBlockToDelete] = useState<CalendarEvent | null>(null);

    const weekendRanges = useMemo(() => {
        const ranges: Array<{ label: string; start: Dayjs; end: Dayjs }> = [];
        const rangeStart = previewFirstDate.startOf("day");

        for (let dayOffset = 0; dayOffset < previewNumDays; dayOffset++) {
            const currentDay = rangeStart.add(dayOffset, "day");
            const dayOfWeek = currentDay.day();

            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                continue;
            }

            const dayName = dayOfWeek === 0 ? "Sunday" : "Saturday";
            const dayStart = currentDay.startOf("day");

            ranges.push({
                label: `${dayName} ${dayStart.format("MMM D")}`,
                start: dayStart,
                end: dayStart.add(1, "day"),
            });
        }

        return ranges;
    }, [previewFirstDate, previewNumDays]);

    const weekendLabel = useMemo(() => {
        if (weekendRanges.length === 0) {
            return "no weekend days in the current calendar range";
        }

        const labels = weekendRanges.map((range) => range.start.format("MMM D"));
        if (labels.length === 1) {
            return labels[0];
        }

        return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
    }, [weekendRanges]);

    const pendingBlockStart = selectedBlockDate && selectedBlockStartTime
        ? dayjs(`${selectedBlockDate} ${selectedBlockStartTime}`, "YYYY-MM-DD HH:mm")
        : null;
    const pendingBlockEnd = selectedBlockDate && selectedBlockEndTime
        ? dayjs(`${selectedBlockDate} ${selectedBlockEndTime}`, "YYYY-MM-DD HH:mm")
        : null;

    const pendingBlockType = blockTypeInput;
    const isWeekendAutoBlock = (slot: CalendarEvent) => {
        if (slot.isWeekend || (slot.blockType ?? "").toUpperCase() === "WEEKEND") {
            return true;
        }

        const normalizedDescription = slot.description?.trim().toLowerCase();
        return normalizedDescription === WEEKEND_AUTO_BLOCK_REASON.toLowerCase()
            || normalizedDescription === "weekend closed";
    };

    const manageableBlocks = useMemo(() => {
        return blockedSlots
            .filter((slot) => slot.id > 0 && !isWeekendAutoBlock(slot))
            .sort((a, b) => (a.startIso ?? "").localeCompare(b.startIso ?? ""));
    }, [blockedSlots]);

    // Prevent creating overlapping blocks in the current dataset before calling the API.
    const pendingBlockConflict = useMemo(() => {
        if (!pendingBlockStart || !pendingBlockEnd) {
            return false;
        }

        return blockedSlots.some((slot) => {
            if (!slot.startIso || !slot.endIso || isWeekendAutoBlock(slot) || (editingBlockId !== null && slot.id === editingBlockId)) {
                return false;
            }

            const slotStart = dayjs(slot.startIso);
            const slotEnd = dayjs(slot.endIso);
            return pendingBlockStart.isBefore(slotEnd) && slotStart.isBefore(pendingBlockEnd);
        });
    }, [editingBlockId, pendingBlockEnd, pendingBlockStart, blockedSlots]);

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
            color: pendingBlockType === "OPEN"
                ? (pendingBlockConflict ? "#dc2626" : "#166534")
                : (pendingBlockConflict ? "#dc2626" : "#2563eb"),
            borderColor: pendingBlockType === "OPEN"
                ? (pendingBlockConflict ? "#991b1b" : "#14532d")
                : (pendingBlockConflict ? "#991b1b" : "#1d4ed8"),
            textColor: "#ffffff",
            conflict: pendingBlockConflict,
            isBlock: true,
            isAvailability: pendingBlockType === "OPEN",
            blockType: pendingBlockType,
        } satisfies CalendarEvent
        : null;

    // Show persisted blocks plus the unsaved preview block in one calendar feed.
    const blockedSlotsWithPreview = [
        ...blockedSlots,
        ...(pendingBlock ? [pendingBlock] : []),
    ];

    // Disable creation until selection is complete and we are not in a conflicting/loading state.
    const pendingBlockStartsInPast = pendingBlockStart ? pendingBlockStart.isBefore(dayjs()) : false;
    const addBlockDisabled =
        !pendingBlockStart ||
        !pendingBlockEnd ||
        pendingBlockStartsInPast ||
        pendingBlockConflict ||
        isSavingBlock ||
        blocksLoading ||
        isTogglingWeekendBlocks;
    const isWeekendAutoBlockEnabled = props.weekendAutoBlockEnabled;

    // Keep toast auto-dismiss behavior consistent with the rest of the app.
    useEffect(() => {
        if (!toastMessage) return;
        const timeout = setTimeout(() => setToastMessage(""), 2500);
        return () => clearTimeout(timeout);
    }, [toastMessage]);

    useEffect(() => {
        let cancelled = false;

        // Hydrate the page with existing persisted blocks on first load.
        const loadBlocks = async () => {
            setBlocksLoading(true);
            setBlockErrorMessage("");

            try {
                const data = await getScheduleBlocks(
                    previewFirstDate.startOf("day").toISOString(),
                    previewFirstDate.add(previewNumDays, "day").startOf("day").toISOString()
                );
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
    }, [previewFirstDate, previewNumDays]);

    const resetBlockForm = () => {
        setSelectedBlockDate("");
        setSelectedBlockStartTime("");
        setSelectedBlockEndTime("");
        setBlockTypeInput("BLOCK");
        setBlockReasonInput("");
        setEditingBlockId(null);
    };

    const handleSaveBlock = async () => {
        if (addBlockDisabled || !pendingBlockStart || !pendingBlockEnd) {
            return;
        }

        // Save the block first; optimistic insertion is intentionally avoided so
        // canceled-reservation counts and any server validations stay authoritative.
        setIsSavingBlock(true);
        setBlockErrorMessage("");

        try {
            const payload = {
                start: pendingBlockStart.toISOString(),
                end: pendingBlockEnd.toISOString(),
                reason: blockReasonInput.trim() || undefined,
                blockType: blockTypeInput,
            };

            const createdBlock = editingBlockId
                ? await updateScheduleBlock(editingBlockId, payload)
                : await createScheduleBlock(payload);

            const canceledReservations = createdBlock.canceledReservations ?? 0;
            const suffix = canceledReservations === 1 ? "" : "s";
            const actionVerb = editingBlockId ? "updated" : "added";
            const canceledMessage = canceledReservations > 0
                ? ` ${canceledReservations} reservation${suffix} canceled.`
                : "";

            setBlockedSlots((previous) => {
                const nextBlocks = editingBlockId
                    ? previous.map((slot) => slot.id === editingBlockId ? parseRawBlockToEvent(createdBlock) : slot)
                    : [...previous, parseRawBlockToEvent(createdBlock)];
                return sortEventsByStartIso(nextBlocks);
            });
            setToastMessage(`Block ${actionVerb}.${canceledMessage}`);
            if (canceledReservations > 0) {
                dispatchReservationDataChanged("canceled");
            }

            resetBlockForm();
            refreshMainCalendar();
        } catch (err) {
            const message = err instanceof Error ? err.message : editingBlockId ? "Failed to update block." : "Failed to add block.";
            setBlockErrorMessage(message);
        } finally {
            setIsSavingBlock(false);
        }
    };

    const handleEditBlock = (block: CalendarEvent) => {
        if (!block.startIso || !block.endIso) {
            return;
        }

        setEditingBlockId(block.id);
        setSelectedBlockDate(dayjs(block.startIso).format("YYYY-MM-DD"));
        setSelectedBlockStartTime(dayjs(block.startIso).format("HH:mm"));
        setSelectedBlockEndTime(dayjs(block.endIso).format("HH:mm"));
        setBlockTypeInput(block.isAvailability ? "OPEN" : "BLOCK");
        setBlockReasonInput(block.description ?? "");
        setBlockErrorMessage("");
        setToastMessage("");
    };

    const handleCancelEdit = () => {
        resetBlockForm();
        setBlockErrorMessage("");
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
        if (editingBlockId === id) {
            resetBlockForm();
        }
        setToastMessage("Block removed.");
        dispatchReservationDataChanged("canceled");
        refreshMainCalendar();
    };

    const handleToggleWeekendBlocks = async () => {
        if (blocksLoading || isSavingBlock || isTogglingWeekendBlocks) {
            return;
        }

        const refreshBlocks = async () => {
            const data = await getScheduleBlocks();
            setBlockedSlots(sortEventsByStartIso(data.map(parseRawBlockToEvent)));
        };

        setIsTogglingWeekendBlocks(true);
        setBlockErrorMessage("");

        try {
            const updated = await updateAppSettings({
                firstDateToShow: props.firstDateToShow,
                numDaysInput: props.numDays.toString(),
                timeStepInput: props.timeStep.toString(),
                maxResTimeInput: props.maxResTime.toString(),
                startTimeInput: props.startTime.format("HH:mm"),
                endTimeInput: props.endTime.format("HH:mm"),
                weekendAutoBlockEnabled: !props.weekendAutoBlockEnabled,
            });

            props.setFirstDateToShow(updated.firstDateToShow);
            props.setFirstDate(dayjs().startOf(updated.firstDateToShow));
            props.setNumDays(updated.numDays);
            props.setTimeStep(updated.timeStep);
            props.setMaxResTime(updated.maxResTime);
            props.setStartTime(updated.startTime);
            props.setEndTime(updated.endTime);
            props.setWeekendAutoBlockEnabled(updated.weekendAutoBlockEnabled);

            await refreshBlocks();
            setToastMessage(
                updated.weekendAutoBlockEnabled
                    ? `Weekend auto-blocking enabled (${WEEKEND_AUTO_BLOCK_REASON}).`
                    : "Weekend auto-blocking disabled."
            );
            refreshMainCalendar();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to update weekend blocks.";
            setBlockErrorMessage(message);
        } finally {
            setIsTogglingWeekendBlocks(false);
        }
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
            console.log("Errors found: ", next.errors);
            return;
        }

        let updated: ParsedAppSettingsData;
        try {
            updated = await updateAppSettings({
                ...inputs,
                firstDateToShow: firstDayInput,
                weekendAutoBlockEnabled: props.weekendAutoBlockEnabled,
            });
        } catch (err) {
            console.error("Failed to update app settings:", err);
            return;
        }

        props.setFirstDateToShow(updated.firstDateToShow);
        props.setFirstDate(dayjs().startOf(updated.firstDateToShow));
        props.setNumDays(updated.numDays);
        props.setTimeStep(updated.timeStep);
        props.setMaxResTime(updated.maxResTime);
        props.setStartTime(updated.startTime);
        props.setEndTime(updated.endTime);
        props.setWeekendAutoBlockEnabled(updated.weekendAutoBlockEnabled);
        setToastMessage("Settings saved.");
        refreshMainCalendar();
    };

    return (
        <>
            <Toast message={toastMessage} />
            <div className="flex flex-wrap gap-2">
                <Button
                    text="Back"
                    className="bg-gray-300 hover:bg-gray-200 mb-7 md:mb-2"
                    onClick={() => safeBack(navigate)}
                />
            </div>
            <section className="mx-5 md:mx-30 space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">App Settings</h1>
                        <p className="text-sm text-gray-500">Update calendar range and reservation timing defaults.</p>
                    </div>
                </div>

                {props.loading && <Spinner/>}
                {!props.loading && <div className={`flex flex-col ${cardPanelClassName} space-y-6`}>
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
                            <label className={formLabelClassName} htmlFor="first-date-to-show">First day to show</label>
                            <select
                                id="first-date-to-show"
                                className={selectInputClassName}
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
                            <label className={formLabelClassName} htmlFor="number-of-days">Number of days to show</label>
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
                            <label className={formLabelClassName} htmlFor="time-step">Time step (minutes)</label>
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
                            <label className={formLabelClassName} htmlFor="max-reservation-time">Max reservation time
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
                            <label className={formLabelClassName} htmlFor="start-time">Start time</label>
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
                            <label className={formLabelClassName} htmlFor="end-time">End time</label>
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

                <div className={`${cardPanelClassName} space-y-4`}>
                    <h2 className="text-2xl font-bold text-gray-900">Add or Block Time Slots</h2>
                    <p className="text-sm text-gray-500">
                        Add blocked windows or open windows for staffed gym time.
                    </p>

                    <div className="rounded border border-gray-200 bg-gray-50 p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Weekend block toggle</p>
                                <p className="text-xs text-gray-600">
                                    Applies recurring weekend auto-blocking (reason "{WEEKEND_AUTO_BLOCK_REASON}") and
                                    keeps future weekends blocked as time advances. Current preview weekend dates: {weekendLabel}.
                                </p>
                            </div>
                            <Button
                                text={
                                    isTogglingWeekendBlocks
                                        ? "Updating..."
                                        : isWeekendAutoBlockEnabled
                                            ? "Weekend blocks: ON"
                                            : "Weekend blocks: OFF"
                                }
                                className={`w-fit font-bold text-white ${
                                    isWeekendAutoBlockEnabled
                                        ? "bg-green-600 border-green-700 hover:bg-green-500 hover:border-green-600"
                                        : "bg-slate-800 border-slate-900 hover:bg-slate-700 hover:border-slate-800"
                                }`}
                                onClick={handleToggleWeekendBlocks}
                                disabled={isTogglingWeekendBlocks || blocksLoading || isSavingBlock}
                            />
                        </div>
                    </div>

                    <ReservationDateTimePicker
                        firstDate={previewFirstDate}
                        numDays={previewNumDays}
                        startTime={previewStartTime}
                        timeStep={previewTimeStep}
                        endTime={previewEndTime}
                        timeWindowStart={blockTypeInput === "OPEN" ? openWindowStartTime : undefined}
                        timeWindowEnd={blockTypeInput === "OPEN" ? openWindowEndTime : undefined}
                        maxResTime={blockMaxDuration}
                        scheduleBlocks={blockedSlots}
                        allowWeekendDates={blockTypeInput === "OPEN"}
                        selectedDate={selectedBlockDate}
                        selectedStartTime={selectedBlockStartTime}
                        selectedEndTime={selectedBlockEndTime}
                        setSelectedDate={setSelectedBlockDate}
                        setSelectedStartTime={setSelectedBlockStartTime}
                        setSelectedEndTime={setSelectedBlockEndTime}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className={formLabelClassName} htmlFor="block-type">
                                Block type
                            </label>
                            <select
                                id="block-type"
                                value={blockTypeInput}
                                onChange={(event) => {
                                    const nextType = event.target.value as "BLOCK" | "OPEN";
                                    setBlockTypeInput(nextType);
                                    setSelectedBlockDate("");
                                    setSelectedBlockStartTime("");
                                    setSelectedBlockEndTime("");
                                }}
                                className={selectInputClassName}
                            >
                                <option value="BLOCK">Blocked time</option>
                                <option value="OPEN">Open window</option>
                            </select>
                            <p className={helperTextClassName}>
                                Open windows override the weekend lock and show the gym is staffed.
                            </p>
                        </div>

                        <div className="max-w-xl">
                        <label className={formLabelClassName} htmlFor="block-reason">
                            {blockTypeInput === "OPEN" ? "Open window note (optional)" : "Block reason (optional)"}
                        </label>
                        <input
                            id="block-reason"
                            type="text"
                            value={blockReasonInput}
                            onChange={(event) => setBlockReasonInput(event.target.value)}
                            placeholder={blockTypeInput === "OPEN"
                                ? "Example: Staffed by trainer, open gym"
                                : "Example: Team lift, facility event, maintenance window"}
                            className={selectInputClassName}
                        />
                        <p className={helperTextClassName}>
                            This note appears on the calendar when someone opens the time slot.
                        </p>
                    </div>
                    </div>

                    {pendingBlockConflict && (
                        <p className="text-sm font-semibold text-red-600">
                            This block overlaps an existing block on the preview calendar.
                        </p>
                    )}
                    {pendingBlockStartsInPast && (
                        <p className="text-sm font-semibold text-red-600">
                            Block start time must be now or later.
                        </p>
                    )}
                    {blockErrorMessage && (
                        <p className="text-sm font-semibold text-red-600">{blockErrorMessage}</p>
                    )}

                    <div className="flex flex-wrap gap-2">
                        <Button
                            text={
                                isSavingBlock
                                    ? (editingBlockId ? "Saving..." : "Adding...")
                                    : editingBlockId
                                        ? "Save Changes"
                                        : blockTypeInput === "OPEN"
                                            ? "Add Open Window"
                                            : "Add Block"
                            }
                            className="text-white font-bold bg-slate-800 border-slate-900 hover:bg-slate-700 hover:border-slate-800 w-fit"
                            onClick={handleSaveBlock}
                            disabled={addBlockDisabled}
                        />
                        {editingBlockId && (
                            <Button
                                text="Cancel Edit"
                                className="bg-gray-200 text-gray-800 hover:bg-gray-300 w-fit"
                                onClick={handleCancelEdit}
                                disabled={isSavingBlock}
                            />
                        )}
                    </div>

                    <div className="rounded border border-gray-200 bg-white p-4">
                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Manage existing blocks</h3>
                                <p className="text-sm text-gray-500">
                                    Edit or delete any persisted block or open window in the current calendar range.
                                </p>
                            </div>
                            <p className="text-xs text-gray-500">
                                Weekends are generated automatically and cannot be edited here.
                            </p>
                        </div>

                        {manageableBlocks.length === 0 ? (
                            <p className="mt-3 text-sm text-gray-500">No persisted blocks in the current calendar range.</p>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {manageableBlocks.map((block) => (
                                    <div
                                        key={block.id}
                                        className="rounded border border-gray-200 bg-gray-50 p-3"
                                    >
                                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {block.date} — {block.startTime} to {block.endTime}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {block.isAvailability ? "Open window" : "Blocked time"}
                                                    {block.description ? ` • ${block.description}` : ""}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    text="Edit"
                                                    className="bg-white text-gray-800 border border-gray-300 hover:bg-gray-100 w-fit"
                                                    onClick={() => handleEditBlock(block)}
                                                    disabled={isSavingBlock}
                                                />
                                                <Button
                                                    text="Delete"
                                                    className="bg-red-600 text-white border-red-700 hover:bg-red-700 w-fit"
                                                    onClick={() => setBlockToDelete(block)}
                                                    disabled={isSavingBlock}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
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

            <ConfirmDialog
                open={blockToDelete !== null}
                title="Delete this block?"
                description={
                    blockToDelete
                        ? `This will remove ${blockToDelete.date} from ${blockToDelete.startTime} to ${blockToDelete.endTime}.`
                        : ""
                }
                confirmLabel="Delete"
                cancelLabel="Keep block"
                tone="danger"
                loading={isSavingBlock}
                onCancel={() => setBlockToDelete(null)}
                onConfirm={async () => {
                    if (!blockToDelete) {
                        return;
                    }

                    const blockId = blockToDelete.id;
                    setBlockToDelete(null);
                    await handleDeleteBlock(blockId);
                }}
            />
        </>
    );
}
