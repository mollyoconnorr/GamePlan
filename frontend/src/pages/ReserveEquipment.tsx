import {useNavigate} from "react-router-dom";
import Button from "../components/Button.tsx";
import {safeBack} from "../util/Navigation.ts";
import Calendar from "../components/calendar/Calendar.tsx";
import {useState} from "react";
import dayjs from "dayjs";

export default function ReserveEquipment(){
    const navigate = useNavigate()

    const [firstDate] = useState(() => dayjs().startOf("day"));

    const startTime = dayjs().startOf("day").hour(8).minute(0);
    const endTime   = dayjs().startOf("day").hour(17).minute(0);

    // TODO: Fetch data from backend for equipment and their attributes etc
    const options = [
        { label: "Ice Bath", value: "ice bath" },
        { label: "Comparison Bath", value: "comparison bath" },
        { label: "Compression Boots", value: "compression boots" },
    ];

    const [equipment, setEquipment] = useState("");


    return (
        <>
            <Button
                text="Back"
                className="bg-gray-300 hover:bg-gray-200"
                onClick={() => safeBack(navigate)}
            />
            <section className="mx-5 md:mx-30 space-y-10">
                <h1 className="text-3xl font-bold text-gray-900">Reserve Equipment</h1>

                <div>
                    {equipment === "" ?
                        (<p>Select an option to view times:</p>) :
                        (<p>Viewing available times for {equipment}</p>)}
                    <DropdownSelect value={equipment} onChange={setEquipment} options={options} />
                </div>

                <Calendar
                    firstDate={firstDate}
                    numDays={7}
                    startTime={startTime}
                    endTime={endTime}
                    timeStepMin={15}
                    variant={"equip"}
                />
            </section>
        </>
    );
}

type Option = { label: string; value: string };

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