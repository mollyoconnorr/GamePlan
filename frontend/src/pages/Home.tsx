import type {PageProps} from "../types.ts";

export default function Home({user} : PageProps){
    return (
        <>
            <h1>Hello, {user.firstName}</h1>
        </>
    )
}