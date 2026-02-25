import { Routes, Route } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";

function AppShell() {
    const { user, logout } = useAuth(); // user is guaranteed by RequireAuth

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar username={user!.username} logout={logout} />

            <main className="flex-1 p-6">
                <Routes>
                    <Route path="/" element={<Home />} />
                </Routes>
            </main>

            <Footer />
        </div>
    );
}

export default function App() {
    return (
        <RequireAuth>
            <AppShell />
        </RequireAuth>
    );
}
