import {Routes, Route, Navigate} from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import ManageReservations from "./pages/ManageReservations.tsx";
import ReserveEquipment from "./pages/ReserveEquipment.tsx";
import Welcome from "./pages/Welcome.tsx";
import Login from "./pages/Login.tsx";

function AppShell() {
    // user is guaranteed by RequireAuth
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar username={user!.username} logout={logout} />

            <main className="flex-1 p-6">
                <Routes>
                    <Route path="home" element={<Home />} />
                    <Route path="manageReservations" element={<ManageReservations />} />
                    <Route path="reserveEquipment" element={<ReserveEquipment />} />
                </Routes>
            </main>

            <Footer />
        </div>
    );
}

export default function App() {
    return (
        <Routes>
            {/* Public landing / redirect target */}
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Login />} />

            {/* Everything under /app is protected */}
            <Route
                path="/app/*"
                element={
                    <RequireAuth redirectTo="/">
                        <AppShell />
                    </RequireAuth>
                }
            />

            {/* unknown routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
