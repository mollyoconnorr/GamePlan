import Button from "../components/Button.tsx";
import {safeBack} from "../util/Navigation.ts";
import {useNavigate} from "react-router-dom";

export default function AppSettings() {
    const navigate = useNavigate();

    return (
        <>
            <div className="flex flex-wrap gap-2">
                <Button text="Back" className="bg-gray-200 hover:bg-gray-100" onClick={() => safeBack(navigate)} />
            </div>
            <section>
                <h1>App settings</h1>
            </section>
        </>
    );
}