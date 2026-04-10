import {useNavigate} from "react-router-dom";
import Button from "../components/Button.tsx";
import {safeBack} from "../util/Navigation.ts";
import Calendar from "../components/calendar/Calendar.tsx";
import {useState, useEffect, useMemo, type Dispatch, type SetStateAction} from "react";
import dayjs from "dayjs";
import type {
    CalendarEvent,
    Reservation,
    EquipmentWithReservations,
    CalendarData
} from "../types.ts";
import {getEquipmentReservations, makeReservation} from "../api/Reservations.ts";
import {parseRawResToEvent, parseRawResToRes, parseResToEvent} from "../util/ParseReservation.ts";
import ReservationDateTimePicker from "../components/ReservationDateTimePicker.tsx";
import {getFriendlyReservationErrorMessage} from "../util/ReservationErrorMessages.ts";
import {getScheduleBlocks} from "../api/Blocks.ts";
import {parseRawBlockToEvent} from "../util/ParseScheduleBlock.ts";
import {getEquipmentTypeAttributes, type EquipmentTypeAttributeResponse} from "../api/Equipment.ts";

interface ReserveEquipmentProps extends CalendarData {
    reservations: Reservation[];
    setReservations: Dispatch<SetStateAction<Reservation[]>>;
}

type Option = { label: string; value: string }; // value = actual attr value or id for equipment/type
type EquipmentTypeResponse = { id: number; name: string };
type AttributeDefinition = { name: string; options: string[] };

export default function ReserveEquipment({firstDate,startTime,endTime,timeStep,
                                             maxResTime,numDays,reservations, setReservations} : ReserveEquipmentProps) {
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

    const previewStart = selectedDate && selectedStartTime
        ? dayjs(`${selectedDate} ${selectedStartTime}`, "YYYY-MM-DD HH:mm")
        : null;
    const previewEnd = selectedDate && selectedEndTime
        ? dayjs(`${selectedDate} ${selectedEndTime}`, "YYYY-MM-DD HH:mm")
        : null;

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
                temp: true
            }
            : null;

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
                color: "#fbbf24",
                borderColor: "#d97706",
                textColor: "#1f2937",
            })),
        [reservations]
    );

    const scheduleBlocksWithConflict = useMemo(() => {
        return scheduleBlocks.map((event) => {
            if (!previewStart || !previewEnd || !event.startIso || !event.endIso) {
                return { ...event, conflict: false };
            }

            const eventStart = dayjs(event.startIso);
            const eventEnd = dayjs(event.endIso);
            const overlaps = previewStart.isBefore(eventEnd) && eventStart.isBefore(previewEnd);

            return { ...event, conflict: overlaps };
        });
    }, [previewEnd, previewStart, scheduleBlocks]);

    const equipmentOtherReservations = useMemo(
        () =>
            equipmentReservationsWithConflict
                .filter((event) => !userReservationIds.has(event.id))
                .map((event) => ({
                    ...event,
                    color: "#dc2626",
                    borderColor: "#b91c1c",
                })),
        [equipmentReservationsWithConflict, userReservationIds]
    );

    const previewReservationWithColor = previewReservation
        ? {
            ...previewReservation,
            color: "#2563eb",
            borderColor: "#1d4ed8",
            textColor: "#ffffff",
        }
        : null;

    const displayedReservations = [
        ...equipmentOtherReservations,
        ...scheduleBlocksWithConflict,
        ...userCalendarEvents,
        ...(previewReservationWithColor ? [previewReservationWithColor] : []),
    ];

    const scheduleBlockConflict = scheduleBlocksWithConflict.some((event) => event.conflict);
    const hasConflict =
        equipmentReservationsWithConflict.some((event) => event.conflict) ||
        userReservationConflict ||
        scheduleBlockConflict;
    const reservationStartsInPast = previewStart ? previewStart.isBefore(dayjs()) : false;
    const conflictMessage = userReservationConflict
        ? "This overlaps another one of your reservations. Delete or adjust that reservation before booking again."
        : scheduleBlockConflict
            ? "This time slot is blocked by a trainer or admin. Pick a different slot."
        : "Someone else already has that equipment at this time; delete this pending reservation and try again or pick a different slot.";

    const needsAttributeSelections = attributeDefinitions.length > 0;
    const allAttributeValuesSelected = !needsAttributeSelections || attributeDefinitions.every(
        (definition) => Boolean(selectedAttributeValues[definition.name])
    );

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

    const allResInfoPresent = selectedType !== null &&
        allAttributeValuesSelected &&
        selectedEquipment !== null &&
        Boolean(selectedDate) &&
        Boolean(selectedStartTime) &&
        Boolean(selectedEndTime) &&
        Boolean(previewReservation);

    // Fetch equipment data whenever one is selected
    useEffect(() => {
        if (!selectedEquipment) return;

        setLoading(true);
        const fetchReservations = async () => {
            try {
                const data = await getEquipmentReservations(selectedEquipment);
                setEquipmentReservations(data.map(parseRawResToEvent));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchReservations();
    }, [selectedEquipment]);

    useEffect(() => {
        const fetchBlocks = async () => {
            try {
                const data = await getScheduleBlocks();
                setScheduleBlocks(data.map(parseRawBlockToEvent));
            } catch (err) {
                console.error("Failed to fetch schedule blocks:", err);
            }
        };

        void fetchBlocks();
    }, []);

    useEffect(() => {
        // Clear stale API error copy when any selected reservation inputs change.
        setReservationErrorMessage("");
    }, [selectedEquipment, selectedDate, selectedStartTime, selectedEndTime]);

    // Fetch equipment types on load
    useEffect(() => {
        fetch("/api/equipment-types", {credentials: "include"})
            .then(res => res.json())
            .then(data => {
                const formatted = (data as EquipmentTypeResponse[]).map((t) => ({
                    label: t.name,
                    value: t.id.toString(),
                }));
                setEquipmentTypes(formatted);
            });
    }, []);

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

    const initializeSelectedAttributeValues = (definitions: AttributeDefinition[]) =>
        definitions.reduce<Record<string, string>>((acc, definition) => {
            acc[definition.name] = "";
            return acc;
        }, {});

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

    // When equipment type changes
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
            const [attributeData, equipmentResponse] = await Promise.all([
                getEquipmentTypeAttributes(typeId),
                fetch(`/api/equipment-types/${typeId}/equipment`, {credentials: "include"}),
            ]);

            if (!equipmentResponse.ok) {
                throw new Error("Failed to fetch equipment options.");
            }

            const definitions = parseTypeAttributes(attributeData);
            const equipmentData = await equipmentResponse.json() as EquipmentWithReservations[];

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

    const handleAttributeValueChange = (attributeName: string, value: string) => {
        setSelectedAttributeValues((prev) => ({
            ...prev,
            [attributeName]: value,
        }));
        setSelectedEquipment(null);
    };

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

            <section className="mx-5 md:mx-30 space-y-10">
                <h1 className="text-3xl font-bold text-gray-900">Reserve Equipment</h1>

                <div className="flex flex-col md:flex-row space-x-10 space-y-10">
                    {/* Equipment Type */}
                    <div>
                        <p className="text-sm lg:text-lg">Select equipment type:</p>
                        <DropdownSelect
                            value={selectedType?.toString() ?? ""}
                            onChange={handleTypeChange}
                            options={equipmentTypes}
                        />
                    </div>

                    {/* Attribute Selector */}
                    {attributeDefinitions.map((attribute) => (
                        <div key={attribute.name}>
                            <p className="text-sm lg:text-lg">Select {attribute.name}:</p>
                            <DropdownSelect
                                value={selectedAttributeValues[attribute.name] ?? ""}
                                onChange={(value) => handleAttributeValueChange(attribute.name, value)}
                                options={attribute.options.map((option) => ({label: option, value: option}))}
                            />
                        </div>
                    ))}

                    {/* Equipment Selector */}
                    {needsAttributeSelections && !allAttributeValuesSelected && (
                        <div className="self-end text-sm text-gray-600">
                            Select a value for each attribute to see equipment.
                        </div>
                    )}
                    {allAttributeValuesSelected && equipmentOptions.length > 0 && (
                        <div>
                            <p className="text-sm lg:text-lg">Select equipment:</p>
                            <div className="mt-2 grid gap-3 md:grid-cols-2">
                                {equipmentOptions.map((equipment) => {
                                    const isSelected = equipment.id === selectedEquipment;
                                    return (
                                        <button
                                            key={equipment.id}
                                            type="button"
                                            className={`rounded-lg border p-4 text-left transition duration-150 hover:cursor-pointer ${
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
                    {allAttributeValuesSelected && equipmentOptions.length === 0 && selectedType !== null && (
                        <div className="self-end text-sm text-gray-600">
                            No available equipment matches the selected attributes.
                        </div>
                    )}
                </div>

                <div>
                    <ReservationDateTimePicker
                        firstDate={firstDate}
                        numDays={numDays}
                        startTime={startTime}
                        timeStep={timeStep}
                        endTime={endTime}
                        maxResTime={maxResTime}
                        selectedDate={selectedDate}
                        selectedStartTime={selectedStartTime}
                        selectedEndTime={selectedEndTime}
                        setSelectedDate={setSelectedDate}
                        setSelectedStartTime={setSelectedStartTime}
                        setSelectedEndTime={setSelectedEndTime}
                    />
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
                        <div className="mt-4 flex flex-wrap gap-4 text-sm">
                            <LegendItem color="#fbbf24" label="Your existing reservations" />
                            <LegendItem color="#dc2626" label="Other athletes' bookings" />
                            <LegendItem color="#111827" label="Admin/trainer blocked time" />
                        </div>
                        <Calendar
                            firstDate={firstDate}
                            numDays={numDays}
                            startTime={startTime}
                            endTime={endTime}
                            timeStepMin={timeStep}
                            variant={"equip"}
                            reservations={displayedReservations}
                            loading={loading}
                        />
                    </>
                )}
            </section>
        </>
    );
}

function LegendItem({ color, label }: { color: string; label: string }) {
    return (
        <div className="flex items-center gap-2">
            <span
                className="inline-block h-4 w-4 rounded-sm border"
                style={{ backgroundColor: color, borderColor: "#000" }}
            />
            <span>{label}</span>
        </div>
    );
}

function DropdownSelect({
                            value,
                            onChange,
                            options,
                        }: {
    value: string;
    onChange: (v: string) => void;
    options: Option[];
}) {
    return (
        <select
            className="border rounded px-2 py-1"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            <option value="" disabled>
                Select an option
            </option>
            {options.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    );
}
