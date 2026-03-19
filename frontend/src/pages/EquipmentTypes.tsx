import { useEffect, useState } from "react";

export default function EquipmentTypes() {
  const [types, setTypes] = useState<any[]>([]);

const handleDeleteType = async (id: number) => {
  if (!window.confirm("Are you sure you want to delete this equipment type?")) return;

  try {
    const response = await fetch(`/api/equipment-types/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      // Remove from state so UI updates immediately
      setTypes((prev) => prev.filter((t) => t.id !== id));
    } else if (response.status === 409) {
      alert("Cannot delete type: equipment of this type exists.");
    } else {
      alert("Failed to delete equipment type");
    }
  } catch (error) {
    console.error(error);
    alert("Error deleting equipment type");
  }
};

  useEffect(() => {
    fetch("/api/equipment-types")
      .then(res => res.json())
      .then(data => setTypes(data));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Equipment Types</h1>

      {types.length === 0 ? (
        <p>No equipment types found.</p>
      ) : (
        <div className="space-y-4">
          {types.map((type) => (
            <div
              key={type.id}
              className="border p-4 rounded shadow"
            >
              <h2 className="text-lg font-semibold">
                {type.name}
              </h2>

              {/* Color */}
              {type.color && (
                <div className="mt-2">
                  <span
                    className="inline-block w-4 h-4 rounded-full mr-2"
                    style={{ backgroundColor: type.color }}
                  />
                  {type.color}
                </div>
              )}

              {/* Raw schema (temporary for debugging) */}
              <pre className="mt-2 text-sm bg-gray-100 p-2 rounded">
                {type.fieldSchema}
              </pre>
                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteType(type.id)}
                    className="mt-2 bg-red-500 hover:bg-red-700 text-white px-2 py-1 rounded"
                  >
                    Delete Type
                  </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}