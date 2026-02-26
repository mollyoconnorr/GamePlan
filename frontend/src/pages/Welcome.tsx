import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Button from "../components/Button.tsx";
import Footer from "../components/Footer.tsx";
import {useAuth} from "../auth/AuthContext.tsx";

export default function Welcome() {
    const navigate = useNavigate();

    const {user, logout} = useAuth();

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar username={user?.username || ""} logout={logout} />

            <main className="flex-1 flex flex-col items-center justify-center text-center px-6">
                <h1 className="text-4xl font-bold mb-4">
                    Equipment Reservation System
                </h1>

                <p className="text-lg text-gray-600 max-w-xl mb-8">
                    Reserve and manage training equipment quickly and efficiently.
                </p>

                {!user && <Button
                    text="Sign in"
                    onClick={() => navigate("/login")}
                    className="bg-blue-600 hover:bg-blue-500 text-white p-2 font-bold"
                />}
                {user && <Button
                  text="View your Calendar"
                  onClick={() => navigate("/app/home")}
                  className="bg-blue-600 hover:bg-blue-500 text-white p-2 font-bold"
                />}
            </main>
            <Footer />
        </div>
    );
}