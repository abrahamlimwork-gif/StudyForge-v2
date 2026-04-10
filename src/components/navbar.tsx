
"use client";

import Link from 'next/link';
import { Button } from './ui/button';
import { Home, LayoutDashboard, LogOut } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    localStorage.removeItem('google_access_token');
    router.push('/');
  };

  return (
    <nav className="bg-slate-950 text-white h-24 px-8 sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
        <Link href="/" className="text-4xl font-black tracking-tighter uppercase flex items-center gap-3">
          <div className="bg-blue-600 size-10 rounded-xl flex items-center justify-center">
            <span className="text-white text-2xl font-black">S</span>
          </div>
          <span>StudyForge</span>
        </Link>
        
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors px-4 py-2">
              Home
            </Link>
            <Link href="/dashboard" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors px-4 py-2">
              Dashboard
            </Link>
          </div>

          <div className="h-8 w-px bg-white/10" />

          {user ? (
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="text-xs font-black uppercase tracking-widest text-red-400 hover:text-red-300 hover:bg-red-500/10 h-12 px-6 rounded-xl"
            >
              <LogOut className="mr-2 size-4" />
              Sign Out
            </Button>
          ) : (
            <Button 
              onClick={() => router.push('/login')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest h-12 px-8 rounded-xl"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
