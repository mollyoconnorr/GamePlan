import "./App.css";
import {useEffect} from "react";
import {useAuth} from "./auth/AuthContext.tsx";
import Navbar from "./components/Navbar.tsx";
import Footer from "./components/Footer.tsx";
import {Route, Routes} from "react-router-dom";
import Home from "./pages/Home.tsx";

function App() {
    const { user, loading, login, logout } = useAuth();

    // Runs after page is rendered
    useEffect(() => {
        // If no user, redirect to login page
        if (!loading && !user) {
            login();
        }
        // Reruns anytime any of these are updated
    }, [user, loading, login]);

    if (loading) return <div>Loading...</div>;

    if (!user) return <div>Loading...</div>;

    // Prevents a weird flicker if the user isn't logged in
    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar
            username={user.username}
            logout={logout}
            />

            <main className="flex-1 p-6">
                <Routes>
                    <Route path="/" element={<Home user={user}/>} />
                </Routes>
            </main>

            <Footer />
        </div>
    );
}

export default App;
