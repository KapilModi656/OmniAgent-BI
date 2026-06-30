import './App.css'
import SignIn from './components/signin';
import Login from './components/login';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {useAtom} from 'jotai';
import {isSignedInState} from './store/store';
import { useEffect } from 'react';
import Sidebar from './components/sidebar';
import Dashboard from './components/dashboard';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background text-foreground transition-colors duration-300">
      {children}
    </div>
  );
}

function DashboardShell() {
  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground transition-colors duration-300">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 bg-muted/20">
          <Dashboard />
        </main>
      </div>
    </div>
  );
}

function App() {
  const [isSignedIn, setIsSignedIn] = useAtom(isSignedInState);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsSignedIn(true);
    }
  }, [setIsSignedIn]);

  return (
    <div className="h-screen w-screen bg-background text-foreground font-sans antialiased selection:bg-primary/20 selection:text-primary transition-colors duration-300">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={isSignedIn ? <Navigate to="/dashboard" replace /> : <AuthShell><Login /></AuthShell>} />
          <Route path="/signup" element={isSignedIn ? <Navigate to="/dashboard" replace /> : <AuthShell><SignIn /></AuthShell>} />
          <Route path="/dashboard" element={isSignedIn ? <DashboardShell /> : <Navigate to="/login" replace />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<AuthShell><div className="text-center p-8 text-muted-foreground">404 — Page not found</div></AuthShell>} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App
