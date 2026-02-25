import Calendar from "../components/calendar/Calendar.tsx";
import {useState} from "react";
import dayjs from "dayjs";
import {useAuthedUser} from "../auth/AuthContext.tsx";

export default function Home(){
    const user = useAuthedUser();

    const [firstDate] = useState(() => dayjs().startOf("day"));

    const startTime = dayjs().startOf("day").hour(8).minute(0);
    const endTime   = dayjs().startOf("day").hour(17).minute(0);

    return (
        <>
            <section className="mx-5 md:mx-30">
                <h1>Hello, {user.firstName}</h1>

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