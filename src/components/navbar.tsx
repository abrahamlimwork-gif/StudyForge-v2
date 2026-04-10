"use client";

import Link from 'next/link';
import { Button } from './ui/button';
import { Home, Beaker } from 'lucide-react';

export function Navbar() {
  return (
    <nav className="bg-primary text-primary-foreground py-4 px-6 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-3xl font-headline font-bold tracking-tight">
          StudyForge
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-xl hover:underline">
            <Home className="size-6" />
            <span>Home</span>
          </Link>
          <Link href="/dashboard" className="flex items-center gap-2 text-xl hover:underline">
            <Beaker className="size-6" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
