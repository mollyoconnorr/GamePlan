import {useNavigate} from "react-router-dom";
import Button from "../components/Button.tsx";
import {safeBack} from "../util/Navigation.ts";
import Calendar from "../components/calendar/Calendar.tsx";
import ManageReservations from "../components/ManageReservations.tsx";
import {useState, useEffect, useMemo, type Dispatch, type SetStateAction} from "react";
import dayjs from "dayjs";
import type {
    CalendarEvent,
    Reservation,
    EquipmentWithReservations,
    CalendarData
} from "../types.ts";
import {getEquipmentReservations, makeReservation} from "../api/Reservations.ts";
import {apiFetch} from "../api/apiFetch.ts";
import {parseRawResToEvent, parseRawResToRes, parseResToEvent} from "../util/ParseReservation.ts";
import ReservationDateTimePicker from "../components/ReservationDateTimePicker.tsx";
import {getFriendlyReservationErrorMessage} from "../util/ReservationErrorMessages.ts";
import {getScheduleBlocks} from "../api/Blocks.ts";
import {parseRawBlockToEvent} from "../util/ParseScheduleBlock.ts";
import {getEquipmentTypeAttributes, type EquipmentTypeAttributeResponse} from "../api/Equipment.ts";
import {cardPanelClassName, formLabelClassName, selectInputClassName} from "../styles/formStyles.ts";
import AvailabilityNotice from "../components/AvailabilityNotice.tsx";
import {
    RESERVATION_DATA_CHANGED_EVENT,
    dispatchReservationDataChanged,
    type ReservationDataChangedDetail,
} from "../util/AppDataEvents.ts";

/**
 * Defines the props required by the ReserveEquipment component.
 */
interface ReserveEquipmentProps extends CalendarData {
    reservations: Reservation[];
    setReservations: Dispatch<SetStateAction<Reservation[]>>;
    weekendAutoBlockEnabled: boolean;
}

/**
 * Label/value option used by equipment type, attribute, and equipment dropdowns.
 */
type Option = { label: string; value: string }; // value = actual attr value or id for equipment/type
/**
 * Minimal equipment type record needed to populate the reservation type dropdown.
 */
type EquipmentTypeResponse = { id: number; name: string };
/**
 * Attribute name and allowed values used to render reservation filters.
 */
type AttributeDefinition = { name: string; options: string[] };

/**
 * Equipment reservation flow:
 * 1) choose type
 * 2) optionally filter by type attributes
 * 3) choose exact equipment
 * 4) pick date/time and submit
 */
export default function ReserveEquipment({firstDate,startTime,endTime,timeStep,
                                             maxResTime,numDays,reservations, setReservations, weekendAutoBlockEnabled} : ReserveEquipmentProps) {
    const navigate = useNavigate();

    // Backend data
    const [equipmentTypes, setEquipmentTypes] = useState<Option[]>([]);
    const [attributeDefinitions, setAttributeDefinitions] = useState<AttributeDefinition[]>([]);
    const [allEquipmentOptions, setAllEquipmentOptions] = useState<EquipmentWithReservations[]>([]);

    // Selections
    const [selectedType, setSelectedType] = useState<number | null>(null);
    const [selectedAttributeValues, setSelectedAttributeValues] = useState<Record<string, string>>({});
    const [selectedEquipment, setSelectedEquipment] = useState<number | null>(null);

    // Reservations
    const [equipmentReservations, setEquipmentReservations] = useState<CalendarEvent[]>([]);
    const [scheduleBlocks, setScheduleBlocks] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);

    const [selectedDate, setSelectedDate] = useState("");
    const [selectedStartTime, setSelectedStartTime] = useState("");
    const [selectedEndTime, setSelectedEndTime] = useState("");
    const [reservationErrorMessage, setReservationErrorMessage] = useState("");
    const [showCalendar, setShowCalendar] = useState(true);

    /**
     * Loads attribute definitions and available equipment for the selected reservation type.
     */
    const loadEquipmentTypeData = async (typeId: number) => {
        const [attributeData, equipmentResponse] = await Promise.all([
            getEquipmentTypeAttributes(typeId),
            apiFetch(`/api/equipment-types/${typeId}/equipment`),
        ]);

        if (!equipmentResponse.ok) {
            throw new Error("Failed to fetch equipment options.");
        }

        const definitions = parseTypeAttributes(attributeData);
        const equipmentData = await equipmentResponse.json() as EquipmentWithReservations[];

        return { definitions, equipmentData };
    };

    const previewStart = selectedDate && selectedStartTime
        ? dayjs(`${selectedDate} ${selectedStartTime}`, "YYYY-MM-DD HH:mm")
        : null;
    const previewEnd = selectedDate && selectedEndTime
        ? dayjs(`${selectedDate} ${selectedEndTime}`, "YYYY-MM-DD HH:mm")
        : null;

    // Temporary event used to preview the in-progress selection in the calendar/list.
    const previewReservation =
        previewStart &&
        previewEnd &&
        selectedEquipment != null
            ? {
                id: selectedEquipment,
                startTime: previewStart.format("h:mm A"),
                endTime: previewEnd.format("h:mm A"),
                name: allEquipmentOptions.find((option) => option.id === selectedEquipment)?.name ?? "",
                date: previewStart.format("ddd M/D"),
                startIso: previewStart.toISOString(),
                endIso: previewEnd.toISOString(),
                temp: true
            }
            : null;

    // Highlight direct conflicts against existing reservations for the selected equipment.
    const equipmentReservationsWithConflict = useMemo(() => {
        return equipmentReservations.map((event) => {
            if (!previewStart || !previewEnd || !event.startIso || !event.endIso) {
                return { ...event, conflict: false };
            }

            const eventStart = dayjs(event.startIso);
            const eventEnd = dayjs(event.endIso);
            const overlaps = previewStart.isBefore(eventEnd) && eventStart.isBefore(previewEnd);

            return { ...event, conflict: overlaps };
        });
    }, [equipmentReservations, previewStart, previewEnd]);

    // Prevent users from creating overlapping reservations for themselves.
    const userReservationConflict = useMemo(() => {
        if (!previewStart || !previewEnd) return false;
        return reservations.some((reservation) => {
            return previewStart.isBefore(reservation.end) && reservation.start.isBefore(previewEnd);
        });
    }, [previewStart, previewEnd, reservations]);
    const userReservationIds = useMemo(
        () => new Set(reservations.map((reservation) => reservation.id)),
        [reservations]
    );

    const userCalendarEvents = useMemo(
        () =>
            reservations.map((reservation) => ({
                ...parseResToEvent(reservation),
                borderColor: "#111827",
                borderStyle: "solid" as const,
                description: "You",
            })),
        [reservations]
    );

    // Blocks conflict unless the preview fits fully inside an OPEN availability window.
    const scheduleBlocksWithConflict = useMemo(() => {
        const openWindowCoversPreview = Boolean(
            previewStart &&
            previewEnd &&
            scheduleBlocks.some((event) => {
                if (!event.isAvailability || !event.startIso || !event.endIso) {
                    return false;
                }

                const eventStart = dayjs(event.startIso);
                const eventEnd = dayjs(event.endIso);
                return !previewStart.isBefore(eventStart) && !previewEnd.isAfter(eventEnd);
            })
        );

        return scheduleBlocks.map((event) => {
            if (!previewStart || !previewEnd || !event.startIso || !event.endIso) {
                return { ...event, conflict: false };
            }

            const eventStart = dayjs(event.startIso);
            const eventEnd = dayjs(event.endIso);
            const overlaps = previewStart.isBefore(eventEnd) && eventStart.isBefore(previewEnd);
            const conflict = event.isAvailability
                ? false
                : event.isWeekend
                    ? overlaps && !openWindowCoversPreview
                    : overlaps;

            return { ...event, conflict };
        });
    }, [previewEnd, previewStart, scheduleBlocks]);

    const equipmentOtherReservations = useMemo(
        () =>
            equipmentReservationsWithConflict
                .filter((event) => !userReservationIds.has(event.id))
                .map((event) => ({
                    ...event,
                    borderColor: "#111827",
                    borderStyle: "dashed" as const,
                    description: "Other athlete",
                })),
        [equipmentReservationsWithConflict, userReservationIds]
    );

    // Unified feed for calendar/list rendering: other users, blocks, current user, then preview.
    const displayedReservations = useMemo(
        () => {
            const previewEvent =
                previewStart &&
                previewEnd &&
                selectedEquipment != null
                    ? {
                        id: selectedEquipment,
                        startTime: previewStart.format("h:mm A"),
                        endTime: previewEnd.format("h:mm A"),
                        name: allEquipmentOptions.find((option) => option.id === selectedEquipment)?.name ?? "",
                        date: previewStart.format("ddd M/D"),
                        startIso: previewStart.toISOString(),
                        endIso: previewEnd.toISOString(),
                        temp: true,
                        color: "#2563eb",
                        borderColor: "#1d4ed8",
                        textColor: "#ffffff",
                    }
                    : null;

            return [
                ...equipmentOtherReservations,
                ...scheduleBlocksWithConflict,
                ...userCalendarEvents,
                ...(previewEvent ? [previewEvent] : []),
            ];
        },
        [
            allEquipmentOptions,
            equipmentOtherReservations,
            previewEnd,
            previewStart,
            scheduleBlocksWithConflict,
            selectedEquipment,
            userCalendarEvents,
        ]
    );

    // Calendar can hold events outside the current window after background refreshes; trim before display.
    const visibleDateLabels = useMemo(
        () => new Set(Array.from({ length: numDays }, (_, index) => firstDate.add(index, "day").format("ddd M/D"))),
        [firstDate, numDays]
    );

    const visibleDisplayedReservations = useMemo(
        () => displayedReservations.filter((event) => visibleDateLabels.has(event.date)),
        [displayedReservations, visibleDateLabels]
    );

    // Collapse all conflict sources into one flag/message so submit and warning UI stay consistent.
    const scheduleBlockConflict = scheduleBlocksWithConflict.some((event) => event.conflict);
    const hasConflict =
        equipmentReservationsWithConflict.some((event) => event.conflict) ||
        userReservationConflict ||
        scheduleBlockConflict;
    const reservationStartsInPast = previewStart ? previewStart.isBefore(dayjs()) : false;
    const firstConflictingScheduleBlock = scheduleBlocksWithConflict.find((event) => event.conflict);
    const conflictMessage = userReservationConflict
        ? "This overlaps another one of your reservations. Delete or adjust that reservation before booking again."
        : firstConflictingScheduleBlock?.isWeekend
            ? "Weekends are blocked off unless an open window is available. Choose a different time."
        : firstConflictingScheduleBlock
            ? "This time slot is blocked by an athletic trainer or admin. Pick a different slot."
        : "Someone else already has that equipment at this time; delete this pending reservation and try again or pick a different slot.";

    const needsAttributeSelections = attributeDefinitions.length > 0;
    const allAttributeValuesSelected = !needsAttributeSelections || attributeDefinitions.every(
        (definition) => Boolean(selectedAttributeValues[definition.name])
    );

    // Equipment choices are hidden until required attribute filters are complete to avoid ambiguous bookings.
    const equipmentOptions = useMemo(() => {
        if (!needsAttributeSelections) {
            return allEquipmentOptions;
        }

        if (!allAttributeValuesSelected) {
            return [];
        }

        return allEquipmentOptions.filter((equipment) => {
            const valueByAttribute = new Map(
                equipment.attributes.map((attribute) => [attribute.name, attribute.value])
            );

            return attributeDefinitions.every((definition) => {
                const selectedValue = selectedAttributeValues[definition.name];
                const fallbackValue = definition.options[0] ?? "";
                const equipmentValue = valueByAttribute.get(definition.name) ?? fallbackValue;
                return equipmentValue === selectedValue;
            });
        });
    }, [
        allAttributeValuesSelected,
        allEquipmentOptions,
        attributeDefinitions,
        needsAttributeSelections,
        selectedAttributeValues,
    ]);

    // Submit requires the full selection plus a valid preview event, which proves the date/time parse succeeded.
    const allResInfoPresent = selectedType !== null &&
        allAttributeValuesSelected &&
        selectedEquipment !== null &&
        Boolean(selectedDate) &&
        Boolean(selectedStartTime) &&
        Boolean(selectedEndTime) &&
        Boolean(previewReservation);

    /**
     * Reload reservations for the currently selected equipment.
     * `silent` skips spinner changes for background polling.
     */
    const loadSelectedEquipmentReservations = async (silent = false) => {
        if (!selectedEquipment) {
            setEquipmentReservations([]);
            return;
        }

        if (!silent) {
            setLoading(true);
        }

        try {
            const data = await getEquipmentReservations(selectedEquipment);
            setEquipmentReservations(data.map(parseRawResToEvent));
        } catch (err) {
            console.error(err);
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    };

    // Rehydrate type metadata and equipment list (used by polling + data-change event listener).
    /**
     * Refreshes selected type data while preserving the current page state.
     */
    const refreshSelectedType = async (silent = true) => {
        if (selectedType === null) {
            return;
        }

        try {
            const { definitions, equipmentData } = await loadEquipmentTypeData(selectedType);
            setAttributeDefinitions(definitions);
            setAllEquipmentOptions(equipmentData);

            if (selectedEquipment) {
                await loadSelectedEquipmentReservations(true);
            }
        } catch (error) {
            console.error(error);
            if (!silent) {
                setAttributeDefinitions([]);
                setSelectedAttributeValues({});
                setAllEquipmentOptions([]);
            }
        }
    };

    // Fetch equipment reservations whenever one is selected so the conflict preview reflects the chosen item.
    useEffect(() => {
        void loadSelectedEquipmentReservations();
    }, [selectedEquipment]);

    // Schedule blocks are shared across all equipment, so load them for the visible calendar range.
    useEffect(() => {
        if (numDays <= 0 || !firstDate.isValid()) {
            return;
        }

        /**
         * Fetches schedule blocks for the visible reservation calendar window.
         */
        const fetchBlocks = async () => {
            const from = firstDate.startOf("day");
            const to = firstDate.add(numDays, "day").startOf("day");

            if (!to.isAfter(from)) {
                return;
            }

            try {
                const data = await getScheduleBlocks(
                    from.toISOString(),
                    to.toISOString()
                );
                setScheduleBlocks(data.map(parseRawBlockToEvent));
            } catch (err) {
                console.error("Failed to fetch schedule blocks:", err);
            }
        };

        void fetchBlocks();
    }, [firstDate, numDays]);

    // Keep selected type data fresh while this page is visible.
    useEffect(() => {
        if (selectedType === null) {
            return;
        }

        let active = true;
        /**
         * Refreshes reservations data while preserving the current page state.
         */
        const refreshReservations = () => {
            if (document.visibilityState !== "visible") {
                return;
            }

            void refreshSelectedType(true).catch((error) => {
                if (!active) return;
                console.error(error);
            });
        };

        const intervalId = window.setInterval(refreshReservations, 30_000);
        window.addEventListener("focus", refreshReservations);
        document.addEventListener("visibilitychange", refreshReservations);

        return () => {
            active = false;
            window.clearInterval(intervalId);
            window.removeEventListener("focus", refreshReservations);
            document.removeEventListener("visibilitychange", refreshReservations);
        };
    }, [selectedEquipment, selectedType, selectedAttributeValues, allEquipmentOptions]);

    // Cross-page refresh when reservations are created/canceled elsewhere in the app.
    useEffect(() => {
        /**
         * Processes the reservation change interaction and updates the affected UI state.
         */
        const handleReservationChange = (event: Event) => {
            const detail = (event as CustomEvent<ReservationDataChangedDetail>).detail;
            if (!detail) {
                return;
            }

            if (selectedType === null) {
                return;
            }

            void refreshSelectedType(true);
        };

        window.addEventListener(RESERVATION_DATA_CHANGED_EVENT, handleReservationChange);
        return () => window.removeEventListener(RESERVATION_DATA_CHANGED_EVENT, handleReservationChange);
    }, [selectedType, selectedEquipment, selectedAttributeValues, allEquipmentOptions]);

    useEffect(() => {
        // Clear stale API error copy when any selected reservation inputs change.
        setReservationErrorMessage("");
    }, [selectedEquipment, selectedDate, selectedStartTime, selectedEndTime]);

    // If admins enable weekend auto-blocking while this page is open, clear weekend draft selections immediately.
    useEffect(() => {
        if (!weekendAutoBlockEnabled || !selectedDate) {
            return;
        }

        const selectedDay = dayjs(selectedDate, "YYYY-MM-DD", true);
        const dayOfWeek = selectedDay.day();

        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            return;
        }

        setSelectedDate("");
        setSelectedStartTime("");
        setSelectedEndTime("");
    }, [selectedDate, weekendAutoBlockEnabled]);

    // Equipment types are static enough for this page that a one-time load is sufficient.
    useEffect(() => {
        apiFetch("/api/equipment-types")
            .then(res => res.json())
            .then(data => {
                const formatted = (data as EquipmentTypeResponse[]).map((t) => ({
                    label: t.name,
                    value: t.id.toString(),
                }));
                setEquipmentTypes(formatted);
            });
    }, []);

    // Normalizes server rows into a grouped attribute schema (name + unique option values).
    const parseTypeAttributes = (rows: EquipmentTypeAttributeResponse[]): AttributeDefinition[] => {
        const grouped = new Map<string, Set<string>>();

        rows.forEach((row) => {
            if (!grouped.has(row.name)) {
                grouped.set(row.name, new Set<string>());
            }

            const options = Array.isArray(row.options)
                ? row.options
                : Array.isArray(row.value)
                    ? row.value
                    : typeof row.value === "string"
                        ? [row.value]
                        : [];

            options.forEach((option) => {
                const trimmedOption = option.trim();
                if (!trimmedOption) return;
                grouped.get(row.name)?.add(trimmedOption);
            });
        });

        return Array.from(grouped.entries()).map(([name, options]) => ({
            name,
            options: Array.from(options),
        }));
    };

    /**
     * Creates the initial selected-value map for each attribute filter on a chosen equipment type.
     */
    const initializeSelectedAttributeValues = (definitions: AttributeDefinition[]) =>
        definitions.reduce<Record<string, string>>((acc, definition) => {
            acc[definition.name] = "";
            return acc;
        }, {});

    /**
     * Formats equipment attributes for display.
     */
    const formatEquipmentAttributes = (equipment: EquipmentWithReservations) => {
        const valueByAttribute = new Map(
            equipment.attributes.map((attribute) => [attribute.name, attribute.value])
        );

        if (attributeDefinitions.length > 0) {
            return attributeDefinitions.map((definition) => {
                const fallbackValue = definition.options[0] ?? "";
                const value = valueByAttribute.get(definition.name) ?? fallbackValue ?? "";
                return `${definition.name}: ${value || "Not set"}`;
            }).join(" · ");
        }

        return equipment.attributes.map((attribute) => `${attribute.name}: ${attribute.value}`).join(" · ");
    };

    // Dynamically narrow each attribute dropdown based on other active filters.
    const availableAttributeOptions = useMemo(() => {
        const optionsByAttribute = new Map<string, string[]>();

        if (!selectedType || attributeDefinitions.length === 0 || allEquipmentOptions.length === 0) {
            return optionsByAttribute;
        }

        attributeDefinitions.forEach((definition) => {
            const matchingEquipment = allEquipmentOptions.filter((equipment) => {
                const equipmentValues = new Map(
                    equipment.attributes.map((attribute) => [attribute.name, attribute.value])
                );

                return attributeDefinitions.every((otherDefinition) => {
                    if (otherDefinition.name === definition.name) {
                        return true;
                    }

                    const selectedValue = selectedAttributeValues[otherDefinition.name];
                    if (!selectedValue) {
                        return true;
                    }

                    return equipmentValues.get(otherDefinition.name) === selectedValue;
                });
            });

            const uniqueOptions = Array.from(new Set(
                matchingEquipment
                    .map((equipment) => {
                        const value = equipment.attributes.find((attribute) => attribute.name === definition.name)?.value;
                        return value?.trim() ?? "";
                    })
                    .filter(Boolean)
            )).sort((left, right) => left.localeCompare(right));

            optionsByAttribute.set(definition.name, uniqueOptions);
        });

        return optionsByAttribute;
    }, [allEquipmentOptions, attributeDefinitions, selectedAttributeValues, selectedType]);

    /**
     * Replaces all dependent selections when the equipment type changes because attributes and equipment are type-specific.
     */
    const handleTypeChange = async (typeIdStr: string) => {
        const typeId = Number.parseInt(typeIdStr, 10);
        if (Number.isNaN(typeId)) {
            return;
        }

        setSelectedType(typeId);
        setSelectedAttributeValues({});
        setSelectedEquipment(null);
        setAttributeDefinitions([]);
        setAllEquipmentOptions([]);

        try {
            const { definitions, equipmentData } = await loadEquipmentTypeData(typeId);
            setAttributeDefinitions(definitions);
            setSelectedAttributeValues(initializeSelectedAttributeValues(definitions));
            setAllEquipmentOptions(equipmentData);
        } catch (error) {
            console.error(error);
            setAttributeDefinitions([]);
            setSelectedAttributeValues({});
            setAllEquipmentOptions([]);
        }
    };

    /**
     * Updates one attribute filter and clears selected equipment because the old item may no longer match.
     */
    const handleAttributeValueChange = (attributeName: string, value: string) => {
        setSelectedAttributeValues((prev) => ({
            ...prev,
            [attributeName]: value,
        }));
        setSelectedEquipment(null);
    };

    /**
     * Submits the validated reservation request and returns the user to Home with a success toast.
     */
    const handleMakeReservation = async () => {
        if (!allResInfoPresent) return;

        if (reservationStartsInPast) {
            setReservationErrorMessage("Start time must be now or later.");
            return;
        }

        setLoading(true);
        setReservationErrorMessage("");

        const payload = {
            equipmentId: selectedEquipment,
            start: dayjs(`${selectedDate} ${selectedStartTime}`).toISOString(),
            end: dayjs(`${selectedDate} ${selectedEndTime}`).toISOString(),
        };

        try {
            const data = await makeReservation(payload);

            setReservations([...reservations, parseRawResToRes(data)])
            dispatchReservationDataChanged("created");

            navigate("/app/home", {state: {toastMessage: "Reservation created!", view: "list"}});

        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : "Failed to create reservation.";
            setReservationErrorMessage(getFriendlyReservationErrorMessage(message));
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <Button
                text="Back"
                className="bg-gray-300 hover:bg-gray-200 mb-7 sm:mb-2"
                onClick={() => safeBack(navigate)}
            />

            <section className="mx-5 md:mx-30 space-y-6">
                <h1 className="text-3xl font-bold text-gray-900">Reserve Equipment</h1>

                <div className={`${cardPanelClassName} space-y-6`}>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Equipment Details</h2>
                        <p className="text-sm text-gray-500">
                            Choose a type, filter attributes, then pick the exact equipment to reserve.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <label className={formLabelClassName} htmlFor="equipment-type-select">Equipment type</label>
                            <DropdownSelect
                                id="equipment-type-select"
                                value={selectedType?.toString() ?? ""}
                                onChange={handleTypeChange}
                                options={equipmentTypes}
                                placeholder="Select equipment type"
                            />
                        </div>

                        {attributeDefinitions.map((attribute) => {
                            const normalizedAttributeName = attribute.name.toLowerCase().replace(/\s+/g, "-");
                            const attributeSelectId = `equipment-attribute-${normalizedAttributeName}`;
                            const availableOptions = availableAttributeOptions.get(attribute.name) ?? [];

                            return (
                                <div key={attribute.name}>
                                    <label className={formLabelClassName} htmlFor={attributeSelectId}>
                                        Select {attribute.name}
                                    </label>
                                    <DropdownSelect
                                        id={attributeSelectId}
                                        value={selectedAttributeValues[attribute.name] ?? ""}
                                        onChange={(value) => handleAttributeValueChange(attribute.name, value)}
                                        options={availableOptions.map((option) => ({label: option, value: option}))}
                                        placeholder={`Select ${attribute.name}`}
                                    />
                                </div>
                            );
                        })}

                        {needsAttributeSelections && !allAttributeValuesSelected && (
                            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:col-span-2 lg:col-span-3">
                                Select a value for each attribute to see equipment options.
                            </p>
                        )}
                        {allAttributeValuesSelected && equipmentOptions.length === 0 && selectedType !== null && (
                            <p className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 sm:col-span-2 lg:col-span-3">
                                No available equipment matches the selected attributes.
                            </p>
                        )}
                    </div>

                    {allAttributeValuesSelected && equipmentOptions.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-gray-700">Select equipment</p>
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {equipmentOptions.map((equipment) => {
                                    const isSelected = equipment.id === selectedEquipment;
                                    return (
                                        <button
                                            key={equipment.id}
                                            type="button"
                                            className={`rounded-lg border p-4 text-left shadow-sm transition duration-150 hover:cursor-pointer ${
                                                isSelected
                                                    ? "border-primary bg-primary/10"
                                                    : "border-gray-200 bg-white hover:border-primary/70"
                                            }`}
                                            onClick={() => setSelectedEquipment(equipment.id)}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold">{equipment.name}</span>
                                                <span className="text-xs text-gray-500">
                                                    {equipment.reservations.length} booked
                                                </span>
                                            </div>
                                            {(attributeDefinitions.length > 0 || equipment.attributes.length > 0) && (
                                                <div className="mt-1 text-xs text-gray-600">
                                                    {formatEquipmentAttributes(equipment)}
                                                </div>
                                            )}
                                            <div className="mt-3 flex flex-col gap-1 text-xs text-gray-500">
                                                {equipment.reservations.length === 0 ? (
                                                    <span className="text-green-600">No upcoming bookings</span>
                                                ) : (
                                                    <>
                                                        {equipment.reservations.slice(0, 2).map((res) => (
                                                            <span key={res.id}>
                                                                {dayjs(res.start).format("ddd h:mm A")} — {dayjs(res.end).format("h:mm A")}
                                                            </span>
                                                        ))}
                                                        {equipment.reservations.length > 2 && (
                                                            <span>+ {equipment.reservations.length - 2} more bookings</span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="border-t border-gray-200 pt-5 space-y-4">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Date and Time</h2>
                            <p className="text-sm text-gray-500">
                                Pick your reservation window.
                            </p>
                        </div>
                        <ReservationDateTimePicker
                            firstDate={firstDate}
                            numDays={numDays}
                            startTime={startTime}
                            timeStep={timeStep}
                            endTime={endTime}
                            maxResTime={maxResTime}
                            scheduleBlocks={scheduleBlocks}
                            selectedDate={selectedDate}
                            selectedStartTime={selectedStartTime}
                            selectedEndTime={selectedEndTime}
                            setSelectedDate={setSelectedDate}
                            setSelectedStartTime={setSelectedStartTime}
                            setSelectedEndTime={setSelectedEndTime}
                            disableWeekends={weekendAutoBlockEnabled}
                        />
                    </div>
                </div>

                {allResInfoPresent && previewReservation && (
                  <div className="space-y-3">
                    <p className="opacity-80">
                      Click below to reserve {previewReservation.name} for {previewReservation.date} from {previewReservation.startTime} to {previewReservation.endTime}
                    </p>
                    {hasConflict && (
                        <p className="text-sm font-semibold text-red-600">
                            {conflictMessage}
                        </p>
                    )}
                    {reservationStartsInPast && (
                        <p className="text-sm font-semibold text-red-600">
                            Start time must be now or later.
                        </p>
                    )}
                    {reservationErrorMessage && (
                        <p className="text-sm font-semibold text-red-600">
                            {reservationErrorMessage}
                        </p>
                    )}
                    <Button
                      text="Reserve"
                      className="bg-green-400 hover:bg-green-300 border-green-500"
                      onClick={handleMakeReservation}
                      disabled={hasConflict || reservationStartsInPast}
                    />
                  </div>
                )}

                {/* Calendar */}
                {selectedEquipment && (
                    <>
                        <AvailabilityNotice events={scheduleBlocks} className="mt-2" />
                        <div className="mt-4 flex flex-wrap gap-4 text-sm">
                            <LegendItem
                                label="Your existing reservations"
                                fillColor="#ffffff"
                                borderColor="#111827"
                                borderStyle="solid"
                            />
                            <LegendItem
                                label="Other athletes' bookings"
                                fillColor="#ffffff"
                                borderColor="#111827"
                                borderStyle="dashed"
                            />
                            <LegendItem
                                label="Unavailable time"
                                fillColor="#111827"
                                borderColor="#111827"
                                borderStyle="solid"
                            />
                            <LegendItem
                                label="Open window"
                                fillColor="#166534"
                                borderColor="#14532d"
                                borderStyle="solid"
                            />
                        </div>
                        <div className="mt-3 flex max-w-md rounded-md border border-black overflow-hidden">
                            <Button
                                text="Calendar"
                                className="flex-1 border-0 border-r rounded-l-none rounded-r-none"
                                onClick={() => setShowCalendar(true)}
                                style={{
                                    backgroundColor: showCalendar ? "var(--purple)" : "",
                                    color: showCalendar ? "white" : "black",
                                }}
                            />
                            <Button
                                text="List"
                                className="flex-1 border-0 rounded-l-none rounded-r-none"
                                onClick={() => setShowCalendar(false)}
                                style={{
                                    backgroundColor: showCalendar ? "" : "var(--purple)",
                                    color: showCalendar ? "black" : "white",
                                }}
                            />
                        </div>

                        {showCalendar ? (
                            <Calendar
                                firstDate={firstDate}
                                numDays={numDays}
                                startTime={startTime}
                                endTime={endTime}
                                timeStepMin={timeStep}
                                maxResTime={maxResTime}
                                variant={"equip"}
                                reservations={visibleDisplayedReservations}
                                loading={loading}
                                focusStartIso={previewReservation?.startIso}
                            />
                        ) : (
                            <ManageReservations
                                reservations={[]}
                                calendarEvents={visibleDisplayedReservations}
                                loading={loading}
                                startTime={startTime}
                                endTime={endTime}
                                timeStepMin={timeStep}
                                maxResTime={maxResTime}
                                isPrivileged={false}
                                readOnly
                                emptyMessage="No reservations found for the selected equipment this week."
                            />
                        )}
                    </>
                )}
            </section>
        </>
    );
}

/**
 * Renders the LegendItem view.
 */
function LegendItem({
                        fillColor,
                        borderColor,
                        borderStyle,
                        label
                    }: {
    fillColor: string;
    borderColor: string;
    borderStyle: "solid" | "dashed" | "dotted";
    label: string;
}) {
    return (
        <div className="flex items-center gap-2">
            <span
                className="inline-block h-4 w-4 rounded-sm border"
                style={{ backgroundColor: fillColor, borderColor, borderStyle }}
            />
            <span>{label}</span>
        </div>
    );
}

/**
 * Renders the DropdownSelect view.
 */
function DropdownSelect({
                            id,
                            value,
                            onChange,
                            options,
                            placeholder,
                        }: {
    id?: string;
    value: string;
    onChange: (v: string) => void;
    options: Option[];
    placeholder: string;
}) {
    return (
        <select
            id={id}
            className={selectInputClassName}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            <option value="">
                {placeholder}
            </option>
            {options.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    );
}
