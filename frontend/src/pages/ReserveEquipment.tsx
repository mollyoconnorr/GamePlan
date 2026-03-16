import { useNavigate } from "react-router-dom";
import Button from "../components/Button.tsx";
import { safeBack } from "../util/Navigation.ts";
import Calendar from "../components/calendar/Calendar.tsx";
import { useState, useEffect } from "react";
import dayjs from "dayjs";

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
  const [selectedAttribute, setSelectedAttribute] = useState<{ label: string; value: string; name: string } | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<number | null>(null);

  // Fetch equipment types on load
  useEffect(() => {
    fetch("/api/equipment-types", { credentials: "include" })
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

    const res = await fetch(`/api/equipment-types/${typeId}/attributes`, { credentials: "include" });
    const data = await res.json();

    if (data.length === 0) {
      // No attributes → fetch equipment immediately
      const eqRes = await fetch(`/api/equipment-types/${typeId}/equipment`, { credentials: "include" });
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

    const res = await fetch(
      `/api/equipment-types/${selectedType}/equipment?attrName=${encodeURIComponent(attr.name)}&attrValue=${encodeURIComponent(attr.value)}`,
      { credentials: "include" }
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

        {/* Equipment Type */}
        <div>
          <p>Select equipment type:</p>
          <DropdownSelect
            value={selectedType?.toString() ?? ""}
            onChange={handleTypeChange}
            options={equipmentTypes}
          />
        </div>

        {/* Attribute Selector */}
        {attributes.length > 0 && (
          <div>
            <p>Select attribute:</p>
            <DropdownSelect
              value={selectedAttribute?.value ?? ""}
              onChange={handleAttributeChange}
              options={attributes.map(a => ({ label: a.label, value: a.value }))}
            />
          </div>
        )}

        {/* Equipment Selector */}
        {equipmentList.length > 0 && (
          <div>
            <p>Select equipment:</p>
            <DropdownSelect
              value={selectedEquipment?.toString() ?? ""}
              onChange={(v) => setSelectedEquipment(parseInt(v))}
              options={equipmentList}
            />
          </div>
        )}

        {/* Calendar */}
        {selectedEquipment && (
          <Calendar
            firstDate={firstDate}
            numDays={7}
            startTime={startTime}
            endTime={endTime}
            timeStepMin={15}
            variant={"equip"}
            equipmentId={selectedEquipment}
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