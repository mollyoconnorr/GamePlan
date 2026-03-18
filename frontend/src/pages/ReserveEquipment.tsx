import {useNavigate} from "react-router-dom";
import Button from "../components/Button.tsx";
import {safeBack} from "../util/Navigation.ts";
import Calendar from "../components/calendar/Calendar.tsx";
import {useState, useEffect} from "react";
import dayjs from "dayjs";
import type {CalendarEvent} from "../types.ts";
import {getEquipmentReservations} from "../api/Reservations.ts";
import {parseRawResToEvent} from "../util/ParseReservation.ts";
import ReservationDateTimePicker from "../components/ReservationDateTimePicker.tsx";

type Option = { label: string; value: string }; // value = actual attr value or id for equipment/type

export default function ReserveEquipment() {
    const navigate = useNavigate();

    const [firstDate] = useState(() => dayjs().startOf("day"));
    const startTime = dayjs().startOf("day").hour(8).minute(0);
    const endTime = dayjs().startOf("day").hour(17).minute(0);

    // Backend data
    const [equipmentTypes, setEquipmentTypes] = useState<Option[]>([]);
    const [attributes, setAttributes] = useState<{ label: string; value: string; name: string }[]>([]);
    const [equipmentList, setEquipmentList] = useState<Option[]>([]);

    // Selections
    const [selectedType, setSelectedType] = useState<number | null>(null);
    const [selectedAttribute, setSelectedAttribute] = useState<{
        label: string;
        value: string;
        name: string
    } | null>(null);
    const [selectedEquipment, setSelectedEquipment] = useState<number | null>(null);

    // Reservations
    const [equipmentReservations, setEquipmentReservations] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);

    const [selectedDate, setSelectedDate] = useState("");
    const [selectedStartTime, setSelectedStartTime] = useState("");
    const [selectedEndTime, setSelectedEndTime] = useState("");

    const previewReservation =
        selectedDate &&
        selectedStartTime &&
        selectedEndTime &&
        selectedEquipment != null
            ? {
                id: selectedEquipment,
                startTime: dayjs(`${selectedDate} ${selectedStartTime}`, " YYYY-mm-dd HH:mm").format("h:mm A"),
                endTime: dayjs(`${selectedDate} ${selectedEndTime}`, " YYYY-mm-dd HH:mm").format("h:mm A"),
                name:
                    equipmentList.find(
                        (e) => parseInt(e.value) === selectedEquipment
                    )?.label ?? "",
                date: dayjs(selectedDate).format("ddd M/D"),
                temp: true
            }
            : null;

    const displayedReservations = previewReservation
        ? [...equipmentReservations, previewReservation]
        : equipmentReservations;

    const allResInfoPresent = selectedType && selectedAttribute && selectedEquipment &&
        selectedDate && selectedStartTime && selectedEndTime && previewReservation;

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

    // Fetch equipment types on load
    useEffect(() => {
        fetch("/api/equipment-types", {credentials: "include"})
            .then(res => res.json())
            .then(data => {
                const formatted = data.map((t: any) => ({
                    label: t.name,
                    value: t.id.toString(),
                }));
                setEquipmentTypes(formatted);
            });
    }, []);

    // When equipment type changes
    const handleTypeChange = async (typeIdStr: string) => {
        const typeId = parseInt(typeIdStr);
        setSelectedType(typeId);
        setSelectedAttribute(null);
        setSelectedEquipment(null);
        setAttributes([]);
        setEquipmentList([]);

        const res = await fetch(`/api/equipment-types/${typeId}/attributes`, {credentials: "include"});
        const data = await res.json();

        if (data.length === 0) {
            // No attributes → fetch equipment immediately
            const eqRes = await fetch(`/api/equipment-types/${typeId}/equipment`, {credentials: "include"});
            const eqData = await eqRes.json();

            setEquipmentList(
                eqData.map((e: any) => ({
                    label: e.name,
                    value: e.id.toString(),
                }))
            );
        } else {
            // Map attributes including name & value
            setAttributes(
                data.map((a: any) => ({
                    label: a.name + ": " + a.value, // display for user
                    value: a.value,                // actual value to send to backend
                    name: a.name                    // name key for backend query
                }))
            );
        }
    };

    // When attribute changes
    const handleAttributeChange = async (attrValue: string) => {
        if (!selectedType) return;
        const attr = attributes.find(a => a.value === attrValue);
        if (!attr) return;

        setSelectedAttribute(attr);
        // Reset equipment selection so user must choose after changing attribute.
        setSelectedEquipment(null);

        const res = await fetch(
            `/api/equipment-types/${selectedType}/equipment?attrName=${encodeURIComponent(attr.name)}&attrValue=${encodeURIComponent(attr.value)}`,
            {credentials: "include"}
        );
        const data = await res.json();

        setEquipmentList(
            data.map((e: any) => ({
                label: e.name,
                value: e.id.toString(),
            }))
        );
    };

    return (
        <>
            <Button
                text="Back"
                className="bg-gray-300 hover:bg-gray-200"
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
                    {attributes.length > 0 && (
                        <div>
                            <p className="text-sm lg:text-lg">Select attribute:</p>
                            <DropdownSelect
                                value={selectedAttribute?.value ?? ""}
                                onChange={handleAttributeChange}
                                options={attributes.map(a => ({label: a.label, value: a.value}))}
                            />
                        </div>
                    )}

                    {/* Equipment Selector */}
                    {equipmentList.length > 0 && (
                        <div>
                            <p className="text-sm lg:text-lg">Select equipment:</p>
                            <DropdownSelect
                                value={selectedEquipment?.toString() ?? ""}
                                onChange={(v) => setSelectedEquipment(parseInt(v))}
                                options={equipmentList}
                            />
                        </div>
                    )}
                </div>

                <div>
                    <ReservationDateTimePicker
                        firstDate={firstDate}
                        numDays={7}
                        startTime={startTime}
                        endTime={endTime}
                        selectedDate={selectedDate}
                        selectedStartTime={selectedStartTime}
                        selectedEndTime={selectedEndTime}
                        setSelectedDate={setSelectedDate}
                        setSelectedStartTime={setSelectedStartTime}
                        setSelectedEndTime={setSelectedEndTime}
                    />
                </div>

                {allResInfoPresent &&
                  <div className="space-y-4">
                    <p
                      className="opacity-80"
                    >Click below to reserve {previewReservation.name} for {previewReservation.date} from {previewReservation.startTime} to {previewReservation.endTime}</p>
                    <Button
                      text="Reserve"
                      className="bg-green-400 hover:bg-green-300 border-green-500"
                    />
                  </div>
                }

                {/* Calendar */}
                {selectedEquipment && (
                    <Calendar
                        firstDate={firstDate}
                        numDays={7}
                        startTime={startTime}
                        endTime={endTime}
                        timeStepMin={15}
                        variant={"equip"}
                        reservations={displayedReservations}
                        loading={loading}
                    />
                )}
            </section>
        </>
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
