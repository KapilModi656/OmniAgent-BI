import {useAtom} from 'jotai';
import {isSignedInState} from '../store/store';
import {API_BASE} from '../utils';
import {useRef, useState} from 'react';

export default function Login() {
    const email = useRef<HTMLInputElement>(null);
    const password = useRef<HTMLInputElement>(null);
    const [, setIsSignedIn] = useAtom(isSignedInState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!email.current || !password.current) {
            setError('Please fill in all fields');
            return;
        }
        if (!email.current.value || !password.current.value) {
            setError('Please fill in all fields');
            return;
        }

        setError(null);
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.current.value, password: password.current.value })
            });

            const data = await res.json();
            setLoading(false);

            if (data.token) {
                localStorage.setItem('token', data.token);
                setIsSignedIn(true);
            } else {
                setError(data.error || data.message || 'Login failed');
            }
        } catch (err: unknown) {
            setLoading(false);
            if (err instanceof Error) setError(err.message);
            else setError(String(err) || 'An unexpected error occurred');
        }
    }

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
            <form onSubmit={handleSubmit} className="w-full max-w-md bg-card/80 backdrop-blur-xl border border-border text-foreground rounded-xl shadow-2xl p-8 transition-colors duration-300">
                <h2 className="text-2xl font-bold mb-6 text-center">Welcome back</h2>

                <label className="block mb-3">
                    <span className="text-sm font-medium text-muted-foreground">Email</span>
                    <input
                        type="email"
                        placeholder="you@example.com"
                        ref={email}
                        className="mt-1 block w-full rounded-md bg-background border border-input px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        aria-label="email"
                    />
                </label>

                <label className="block mb-4">
                    <span className="text-sm font-medium text-muted-foreground">Password</span>
                    <input
                        type="password"
                        placeholder="Your password"
                        ref={password}
                        className="mt-1 block w-full rounded-md bg-background border border-input px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        aria-label="password"
                    />
                </label>

                {error && <div className="mb-4 text-sm text-red-500 font-medium" role="alert">{error}</div>}

                <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed text-primary-foreground font-semibold rounded-md px-4 py-2 transition-opacity shadow-md mt-2"
                    disabled={loading}
                >
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>

                <p className="mt-6 text-center text-sm text-muted-foreground">Don’t have an account? <a href="/signup" className="text-primary font-medium hover:underline">Create one</a></p>
            </form>
        </div>
    )
}
