
"use client";

import Link from 'next/link';
import { useAuth } from './providers/auth-provider';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { Button } from './ui/button';
import { LogOut, Home, Presentation } from 'lucide-react';

export function Navbar() {
  const { user } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (!user) return null;

  return (
    <nav className="bg-primary text-primary-foreground py-4 px-6 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/dashboard" className="text-3xl font-headline font-bold tracking-tight">
          StudyForge
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-xl hover:underline">
            <Home className="size-6" />
            <span>Dashboard</span>
          </Link>
          <Button 
            variant="secondary" 
            size="lg"
            className="text-xl px-6 h-12 font-bold"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 size-6" />
            Log Out
          </Button>
        </div>
      </div>
    </nav>
  );
}
