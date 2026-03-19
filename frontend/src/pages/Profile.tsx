import {useAuthedUser} from "../auth/AuthContext.tsx";

export default function Profile() {
    const user = useAuthedUser();

    return (
        <section className="mx-5 md:mx-30 space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Profile</h1>

            <div className="max-w-xl rounded-md border bg-white p-6 shadow-md">
                <div className="grid grid-cols-[130px_1fr] gap-y-3 text-sm md:text-base">
                    <p className="font-semibold text-gray-700">First name</p>
                    <p>{user.firstName}</p>

                    <p className="font-semibold text-gray-700">Last name</p>
                    <p>{user.lastName}</p>

                    <p className="font-semibold text-gray-700 my-5">Role</p>
                    <p className="my-5">{user.role.substring(0,1).toUpperCase()}{user.role.substring(1).toLowerCase()}</p>

                    <p className="font-semibold text-gray-700">Username</p>
                    <p>{user.username}</p>

                    <p className="font-semibold text-gray-700">Email</p>
                    <p>{user.email}</p>
                </div>
            </div>
        </section>
    );
}
