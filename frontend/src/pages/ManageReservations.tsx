import Button from "../components/Button.tsx";
import {useNavigate} from "react-router-dom";

export default function ManageReservations(){
    const navigate = useNavigate()

    return (
        <>
            <Button
                text="Back"
                className="bg-gray-300 hover:bg-gray-200"
                onClick={() => navigate(-1)}
            />
            <h1>Manage Reservations</h1>

        </>
    );
}