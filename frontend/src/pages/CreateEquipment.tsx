import { useState, useEffect } from "react";
import {useNavigate} from "react-router-dom";
import Button from "../components/Button.tsx";
import {safeBack} from "../util/Navigation.ts";

export default function CreateEquipment() {
    const navigate = useNavigate();
  const [types, setTypes] = useState<any[]>([]);
  const [typeName, setTypeName] = useState("");
  const [typeColor, setTypeColor] = useState("#000000");
  const [attributesSchema, setAttributesSchema] = useState<
    { name: string; options: string }[]
  >([]);

  const addAttribute = () => {
    setAttributesSchema([
      ...attributesSchema,
      { name: "", options: "" }
    ]);
  };

const buildSchema = () => {
  const schema: any = {};

  attributesSchema.forEach(attr => {
    if (!attr.name) return;

    schema[attr.name] = {
      type: "enum",
      options: attr.options
        .split(",")
        .map(o => o.trim())
        .filter(o => o.length > 0)
    };
  });

  return JSON.stringify(schema);
};

  // New Equipment State
  const [selectedType, setSelectedType] = useState<any>(null);
  const [equipmentName, setEquipmentName] = useState("");
  const [attributes, setAttributes] = useState<{ name: string; value: string }[]>([]);
  const [selectedAttribute, setSelectedAttribute] = useState<{ name: string; value: string } | null>(null);

  // Fetch Equipment Types
  useEffect(() => {
    fetch("/api/equipment-types")
      .then(res => res.json())
      .then(data => setTypes(data));
  }, []);

  // Create New Equipment Type
  const createEquipmentType = async () => {
    await fetch("/api/equipment-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: typeName, fieldSchema: buildSchema(), color: typeColor }),
    });

    const updated = await fetch("/api/equipment-types").then(r => r.json());
    setTypes(updated);
    setTypeName("");
  };

  // Handle Type Selection for New Equipment
  const handleTypeChange = async (typeId: number) => {
    const type = types.find(t => t.id === typeId);
    setSelectedType(type);
    setSelectedAttribute(null);
    setAttributes([]);

    // Fetch attributes from backend for the selected type
    const res = await fetch(`/api/equipment-types/${typeId}/attributes-all`);
    const data = await res.json(); // [{name, value}, ...]
    setAttributes(data);
  };

  // Handle Attribute Selection
    const handleAttributeChange = (selectedValue: string) => {
      let selected = null;
      for (const attr of attributes) {
        if (attr.options?.includes(selectedValue)) {
          selected = { name: attr.name, value: selectedValue };
          break;
        }
      }
      setSelectedAttribute(selected);
    };

  // Create New Equipment
  const createEquipment = async () => {
    if (!selectedType || !equipmentName) return;

    const attrMap = selectedAttribute
      ? { [selectedAttribute.name]: selectedAttribute.value }
      : {};

    await fetch("/api/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: equipmentName,
        equipmentTypeId: selectedType.id,
        attributes: attrMap,
      }),
    });

    alert("Equipment created!");
    setEquipmentName("");
    setSelectedType(null);
    setAttributes([]);
    setSelectedAttribute(null);
  };

  return (
    <>
        <Button
            text="Back"
            className="bg-gray-300 hover:bg-gray-200"
            onClick={() => safeBack(navigate)}
        />
        <section className="mx-5 md:mx-30 space-y-10">
          <h1 className="text-2xl font-bold mb-6">Manage Equipment</h1>

          {/* CREATE EQUIPMENT TYPE */}
          <div className="mb-10">
            <h2 className="text-xl font-semibold mb-2">Create Equipment Type</h2>
            <input
              placeholder="Type name"
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              className="border p-2 mr-2"
            />
            <input
              type="color"
              value={typeColor}
              onChange={(e) => setTypeColor(e.target.value)}
              className="mr-2"
            />
                {/* ===================== */}
                {/* ADD EQUIPMENT ATTRIBUTE TO TYPE */}
                {/* ===================== */}
                {attributesSchema.map((attr, index) => (
                  <div key={index} className="mb-2">
                    <input
                      placeholder="Attribute name (e.g. size)"
                      value={attr.name}
                      onChange={(e) => {
                        const updated = [...attributesSchema];
                        updated[index].name = e.target.value;
                        setAttributesSchema(updated);
                      }}
                      className="border p-1 mr-2"
                    />

                    <input
                      placeholder="Options (comma separated)"
                      value={attr.options}
                      onChange={(e) => {
                        const updated = [...attributesSchema];
                        updated[index].options = e.target.value;
                        setAttributesSchema(updated);
                      }}
                      className="border p-1"
                    />
                  </div>
                ))}

            <button onClick={createEquipmentType} className="bg-blue-600 text-white px-4 py-2">
              Create
            </button>
          </div>


        <button onClick={addAttribute} className="bg-gray-300 px-2 py-1 mt-2">
          + Add Attribute
        </button>

          {/* ===================== */}
          {/* CREATE EQUIPMENT */}
          {/* ===================== */}
          <div className="mb-10">
            <h2 className="text-xl font-semibold mb-2">Create Equipment</h2>

            {/* Select Equipment Type */}
            <select
              className="border p-2 mb-4"
              value={selectedType?.id || ""}
              onChange={(e) => handleTypeChange(Number(e.target.value))}
            >
              <option value="">Select Type</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Equipment Name */}
            <div className="mb-4">
              <input
                placeholder="Equipment name"
                value={equipmentName}
                onChange={(e) => setEquipmentName(e.target.value)}
                className="border p-2"
              />
            </div>

            {/* Attribute Dropdown */}
            {attributes.length > 0 && (
              <div className="mb-4">
                <label>Select Attribute:</label>
                <select
                  value={selectedAttribute?.value ?? ""}
                  onChange={(e) => handleAttributeChange(e.target.value)}
                  className="border p-2 ml-2"
                >
                  <option value="">Select</option>
                  {attributes.map(attr =>
                    attr.options?.map(opt => ( // optional chaining
                      <option key={`${attr.name}-${opt}`} value={opt}>
                        {attr.name}: {opt}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}



            <button onClick={createEquipment} className="bg-green-600 text-white px-4 py-2 mt-2">
              Create Equipment
            </button>
          </div>
        </section>
    </>
  );
}