import {useNavigate} from "react-router-dom";
import Button from "../components/Button.tsx";

export default function ReserveEquipment(){
    const navigate = useNavigate()

    return (
        <>
            <Button
                text="Back"
                className="bg-gray-300 hover:bg-gray-200"
                onClick={() => navigate(-1)}
            />
            <h1>Reserve Equipment</h1>
        </>
    );
}