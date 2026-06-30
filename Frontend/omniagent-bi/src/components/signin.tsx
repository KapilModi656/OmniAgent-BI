import {useAtom} from 'jotai';
import {isSignedInState} from '../store/store';
import {API_BASE} from '../utils';
import {useRef, useState} from 'react';

export default function SignIn() {
    const email = useRef<HTMLInputElement>(null);
    const password = useRef<HTMLInputElement>(null);
    const name = useRef<HTMLInputElement>(null);
    const [isSignedIn, setIsSignedIn] = useAtom(isSignedInState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if(!email.current || !password.current || !name.current) {
            setError('Please fill in all fields');
            return;
        }
        if(!email.current.value || !password.current.value || !name.current.value) {
            setError('Please fill in all fields');
            return;
        }

        setError(null);
        setLoading(true);

        const res = await fetch(`${API_BASE}/signin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name.current.value,
                email: email.current.value,
                password: password.current.value
            })
        });

        const response = await res.json();
        setLoading(false);

        if (response.token) {
            localStorage.setItem('token', response.token);
            setIsSignedIn(true);
        } else {
            setError(response.error || response.message || 'Sign in failed');
        }
    }

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4 w-full">
            <form onSubmit={handleSubmit} className="w-full max-w-md bg-card/80 backdrop-blur-xl border border-border text-foreground rounded-xl shadow-2xl p-8 transition-colors duration-300">
                <h2 className="text-2xl font-bold mb-6 text-center">Create an account</h2>

                <label className="block mb-3">
                    <span className="text-sm font-medium text-muted-foreground">Name</span>
                    <input
                        type="text"
                        placeholder="Your full name"
                        ref={name}
                        className="mt-1 block w-full rounded-md bg-background border border-input px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        aria-label="name"
                    />
                </label>

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
                        placeholder="Create a password"
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
                    {loading ? 'Creating...' : 'Sign Up'}
                </button>

                <p className="mt-6 text-center text-sm text-muted-foreground">Already have an account? <span className="text-primary font-medium"><a href="/login" className="hover:underline">Login</a></span></p>
            </form>
        </div>
    )
}