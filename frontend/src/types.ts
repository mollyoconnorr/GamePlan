export type User = {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
};

export type AuthState = {
    user: User | null;
    loading: boolean;
    refresh: () => Promise<void>;
    login: () => void;
    logout: () => void;
}