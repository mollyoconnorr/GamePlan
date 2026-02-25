import Calendar from "../components/calendar/Calendar.tsx";
import {useState} from "react";
import dayjs from "dayjs";
import {useAuthedUser} from "../auth/AuthContext.tsx";
import Button from "../components/Button.tsx";
import {useNavigate} from "react-router-dom";

export default function Home(){
    const user = useAuthedUser();

    const navigate = useNavigate();

    const [firstDate] = useState(() => dayjs().startOf("day"));

    const startTime = dayjs().startOf("day").hour(8).minute(0);
    const endTime   = dayjs().startOf("day").hour(17).minute(0);

    return (
        <>
            <section className="mx-5 md:mx-30 flex flex-col space-y-7">
                <h1
                    className="text-3xl font-bold text-gray-900"
                >Hello, {user.firstName}</h1>

                <div className="ml-auto mr-0 space-x-10">
                    <Button
                        text="Manage Reservations"
                        className="bg-blue-400 hover:bg-blue-300 border-green-500"
                        onClick={() => {navigate("/manageReservations")}}
                    />

                    <Button
                        text="Reserve Equipment"
                        className="bg-green-400 hover:bg-green-300 border-green-500"
                        onClick={() => {navigate("/reserveEquipment")}}
                    />

                </div>

                <Calendar
                    firstDate={firstDate}
                    numDays={7}
                    startTime={startTime}
                    endTime={endTime}
                    timeStepMin={15}
                />
            </section>
        </>
    )
}