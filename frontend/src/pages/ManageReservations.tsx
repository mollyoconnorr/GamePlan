import Button from "../components/Button.tsx";
import {useNavigate} from "react-router-dom";
import {type JSX, useEffect, useState} from "react";
import type {CalendarEvent, RawReservation, Reservation} from "../types.ts";
import {getReservations} from "../api/Reservations.ts";
import Spinner from "../components/Spinner.tsx";
import {parseRawResToRes} from "../util/ParseReservationInfo.ts";
import dayjs from "dayjs";
import {SquarePen, Trash2} from "lucide-react";

export default function ManageReservations() {
    const navigate = useNavigate()

    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);

    // TODO error handling
    useEffect(() => {
        const load = async () => {
            try {
                const data = await getReservations();
                setReservations(data.map(parseRawResToRes));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const dayEventMap: Map<string, { dayLabel: string; events: Reservation[] }> = new Map();

    reservations.forEach((r) => {
        const dayKey = r.start.startOf("day").format("YYYY-MM-DD");
        const dayLabel = r.start.format("dddd, MMMM D");

        const existing = dayEventMap.get(dayKey);
        if (!existing) {
            dayEventMap.set(dayKey, {dayLabel, events: [r]});
        } else {
            existing.events.push(r);
        }
    });

    const dayEventArr = [...dayEventMap.entries()]
        .sort(([a], [b]) => dayjs(a).valueOf() - dayjs(b).valueOf())
        .map(([dayKey, {dayLabel, events}]) => ({dayKey, dayLabel, events}));

    return (
        <>
            <Button
                text="Back"
                className="bg-gray-300 hover:bg-gray-200"
                onClick={() => navigate(-1)}
            />
            <section className="mx-5 md:mx-30">

                <h1 className="text-3xl font-bold text-gray-900">Manage Reservations</h1>

                {loading && <Spinner/>}

                {!loading && dayEventArr.map(({dayKey, dayLabel, events}) => (
                    <div key={dayKey}
                         className="flex flex-col bg-calendar-bg border-calendar-border shadow-md p-5 space-y-5 items-center">
                        <h2 className="text-2xl font-medium ml-5 mr-auto">{dayLabel}</h2>

                        {events.map((e) => (
                            <ReservationCard
                                key={e.id}
                                startTime={e.start.format("h:mm A")}
                                endTime={e.end.format("h:mm A")}
                                name={e.name}/>
                        ))}

                        <hr className="m-5 border w-full"/>
                    </div>
                ))}
            </section>
        </>
    );
}

function ReservationCard({startTime, endTime, name}: { startTime: string, endTime: string, name: string }) {
    return (
        <div className="flex w-full justify-between items-center border
         shadow-md rounded-md bg-orange-400 px-2 max-w-[80%]">
            {/*TODO Fix hardcoded colors*/}
            <div className="flex flex-col md:flex-row space-x-1">
                <p className="text-wrap">
                    {startTime} -
                </p>
                <p>{endTime}</p>
            </div>
            <p>{name}</p>
            <div className="flex flex-col p-2 space-y-6">
                <button
                    className="hover:cursor-pointer"
                    title="Edit Reservation"
                >
                    <SquarePen/>
                </button>
                <button
                    className="hover:cursor-pointer"
                    title="Delete Reservation"
                >
                    <Trash2/>
                </button>
            </div>
        </div>
    )
}