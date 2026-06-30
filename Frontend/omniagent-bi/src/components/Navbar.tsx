import { useAtom } from 'jotai';
import { themeModeAtom, userProfileAtom, isSignedInState } from '../store/store';
import { useEffect, useState, useRef } from 'react';
import { API_BASE, getAuthHeaders, tryJson } from '../utils';

export default function Navbar() {
  const [themeMode, setThemeMode] = useAtom(themeModeAtom);
  const [userProfile, setUserProfile] = useAtom(userProfileAtom);
  const [, setIsSignedIn] = useAtom(isSignedInState);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleTheme = () => {
    const newTheme = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newTheme);
    localStorage.setItem('themeMode', newTheme);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsSignedIn(false);
  };

  useEffect(() => {
    // Only apply class to HTML element for Tailwind dark mode
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themeMode]);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await tryJson(`${API_BASE}/user/me`, {
          method: 'GET',
          headers: getAuthHeaders(),
        });
        if (res && typeof res === 'object' && (res as Record<string, unknown>).user) {
          setUserProfile((res as Record<string, unknown>).user as { name: string; email: string });
        }
      } catch (err) {
        console.error('Failed to fetch user', err);
      }
    }
    if (!userProfile) {
      fetchUser();
    }
  }, [userProfile, setUserProfile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6 shadow-sm z-10 transition-colors duration-300">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-md">
          O
        </div>
        <span className="text-lg font-bold text-foreground">OmniAgent BI</span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Toggle Theme"
        >
          {themeMode === 'light' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          )}
        </button>

        <div className="relative pl-4 border-l border-border" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none"
          >
            <div className="flex flex-col text-right">
              <span className="text-sm font-semibold text-foreground leading-tight">
                {userProfile?.name || 'User'}
              </span>
              <span className="text-xs text-muted-foreground leading-tight">
                {userProfile?.email || 'Loading...'}
              </span>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold shadow-sm border border-border/50">
              {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
            </div>
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg py-2 z-50 animate-fade-in-up origin-top-right">
              <div className="px-4 py-2 border-b border-border/50 mb-1">
                <p className="text-sm font-medium text-foreground truncate">{userProfile?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{userProfile?.email}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-colors flex items-center gap-2 font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
