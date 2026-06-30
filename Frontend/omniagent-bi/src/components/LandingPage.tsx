import { Link, useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { isSignedInState } from '../store/store';
import { useEffect, useState } from 'react';

export default function LandingPage() {
    const [isSignedIn] = useAtom(isSignedInState);
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300 font-sans selection:bg-primary/30">
            {/* Navigation Bar */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${isScrolled ? 'bg-background/80 backdrop-blur-md border-border shadow-sm py-3' : 'bg-transparent border-transparent py-5'}`}>
                <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-600 text-white font-bold shadow-lg shadow-primary/30">
                            O
                        </div>
                        <span className="text-xl font-black tracking-tight text-foreground">OmniAgent BI</span>
                    </div>
                    <div className="flex items-center gap-4">
                        {isSignedIn ? (
                            <Link to="/dashboard" className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300">
                                Go to Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" className="px-5 py-2.5 rounded-full text-foreground font-medium text-sm hover:text-primary transition-colors">
                                    Log In
                                </Link>
                                <Link to="/signup" className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300">
                                    Get Started Free
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex flex-col items-center text-center px-6">
                
                {/* Decorative Background Elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '8s' }}></div>
                <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none -z-10"></div>
                
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/30 backdrop-blur-sm text-sm text-muted-foreground font-medium mb-8 animate-fade-in-up">
                    <span className="flex h-2 w-2 rounded-full bg-primary animate-ping relative"><span className="absolute h-full w-full rounded-full bg-primary opacity-50"></span></span>
                    AI-Powered Analytics 2.0 is Here
                </div>

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.1] mb-6 max-w-5xl mx-auto">
                    Turn your raw data into <br className="hidden md:block"/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-500 to-purple-600 animate-gradient-x">
                        intelligent insights.
                    </span>
                </h1>

                <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
                    OmniAgent BI uses autonomous AI agents to analyze datasets, build machine learning models, and execute predictions—no coding required.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                    {isSignedIn ? (
                        <button onClick={() => navigate('/dashboard')} className="w-full sm:w-auto px-8 py-4 rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2">
                            Enter Dashboard
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                        </button>
                    ) : (
                        <>
                            <button onClick={() => navigate('/signup')} className="w-full sm:w-auto px-8 py-4 rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2">
                                Start Building Free
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                            </button>
                            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto px-8 py-4 rounded-full bg-muted/50 border border-border text-foreground font-bold text-lg hover:bg-muted hover:border-muted-foreground/50 transition-all duration-300 backdrop-blur-sm">
                                Explore Features
                            </button>
                        </>
                    )}
                </div>

                {/* Dashboard Mockup Preview */}
                <div className="mt-20 w-full max-w-6xl mx-auto px-4 relative perspective-1000">
                    <div className="relative rounded-2xl md:rounded-[2rem] border border-border/50 bg-card/40 backdrop-blur-xl shadow-2xl p-2 md:p-4 overflow-hidden transform hover:-translate-y-2 hover:shadow-primary/20 transition-all duration-700">
                        {/* Mockup Toolbar */}
                        <div className="flex items-center gap-2 px-3 pb-3 border-b border-border/50 mb-3 md:mb-0">
                            <div className="h-3 w-3 rounded-full bg-red-500/80"></div>
                            <div className="h-3 w-3 rounded-full bg-amber-500/80"></div>
                            <div className="h-3 w-3 rounded-full bg-green-500/80"></div>
                        </div>
                        {/* Mockup Content Layout */}
                        <div className="h-[300px] md:h-[600px] w-full bg-background rounded-lg md:rounded-xl border border-border overflow-hidden flex flex-col md:flex-row relative">
                            {/* Sidebar Mock */}
                            <div className="w-16 md:w-64 border-r border-border bg-muted/10 hidden sm:flex flex-col p-4 gap-4">
                                <div className="h-8 bg-muted rounded-md w-full animate-pulse"></div>
                                <div className="h-8 bg-muted rounded-md w-3/4 opacity-50"></div>
                                <div className="h-8 bg-muted rounded-md w-5/6 opacity-50"></div>
                            </div>
                            {/* Main Content Mock */}
                            <div className="flex-1 p-4 md:p-8 flex flex-col gap-6">
                                <div className="flex justify-between items-center">
                                    <div className="h-10 w-48 bg-muted rounded-lg animate-pulse"></div>
                                    <div className="h-10 w-10 bg-primary/20 rounded-full"></div>
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[1,2,3,4].map(i => (
                                        <div key={i} className="h-24 bg-muted/20 border border-border rounded-xl p-4 flex flex-col justify-center">
                                            <div className="h-4 w-1/2 bg-muted rounded mb-2"></div>
                                            <div className="h-8 w-1/3 bg-primary/30 rounded"></div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex-1 bg-muted/10 border border-border rounded-xl p-6 relative overflow-hidden flex items-center justify-center">
                                    {/* Abstract Chart Representation */}
                                    <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-primary/10 to-transparent"></div>
                                    <svg className="w-full h-full text-primary/20" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        <path d="M0,100 L0,70 Q10,80 20,60 T40,40 T60,50 T80,30 T100,20 L100,100 Z" fill="currentColor" stroke="none" />
                                        <path d="M0,70 Q10,80 20,60 T40,40 T60,50 T80,30 T100,20" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.5" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Features Section */}
            <section id="features" className="py-24 bg-muted/5 border-y border-border">
                <div className="container mx-auto px-6 md:px-12">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Everything you need to scale intelligence</h2>
                        <p className="text-lg text-muted-foreground font-medium">Stop wrestling with pandas and scikit-learn. Let autonomous agents handle data cleaning, feature engineering, and model training.</p>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="bg-card border border-border rounded-2xl p-8 hover:border-primary/50 transition-colors duration-300 group">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-3">Automated EDA</h3>
                            <p className="text-muted-foreground leading-relaxed">Instantly generate comprehensive exploratory data analysis reports. Understand data distribution and missing values visually.</p>
                        </div>
                        {/* Feature 2 */}
                        <div className="bg-card border border-border rounded-2xl p-8 hover:border-indigo-500/50 transition-colors duration-300 group">
                            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-3">Machine Learning Pipeline</h3>
                            <p className="text-muted-foreground leading-relaxed">Agents automatically construct robust pre-processing and modeling pipelines, picking the best algorithm for your dataset.</p>
                        </div>
                        {/* Feature 3 */}
                        <div className="bg-card border border-border rounded-2xl p-8 hover:border-purple-500/50 transition-colors duration-300 group">
                            <div className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-5"/><path d="M9 7v2"/><path d="M15 7v2"/><path d="M12 2a10 10 0 0 0-10 10c0 4.2 2.6 7.8 6.4 9.3"/><path d="M22 12c0-4.2-2.6-7.8-6.4-9.3"/></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-3">Batch Inference</h3>
                            <p className="text-muted-foreground leading-relaxed">Run millions of rows through your trained pipelines effortlessly with our powerful batched prediction engine.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 text-center text-muted-foreground border-t border-border">
                <p className="text-sm font-medium">© {new Date().getFullYear()} OmniAgent BI. All rights reserved.</p>
            </footer>
        </div>
    );
}
