import { useEffect } from "react";

export default function Login() {
    useEffect(() => {
        window.location.href = "http://localhost:8080/oauth2/authorization/okta";
    }, []);

    return <p>Redirecting to login...</p>;
}