"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Video, ArrowRight, ShieldCheck, GraduationCap, Loader2 } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  // Redirect authenticated users immediately to dashboard
  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
        <Loader2 className="size-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-12">
      <div className="space-y-4 max-w-3xl">
        <div className="flex justify-center mb-6">
          <div className="bg-primary p-6 rounded-3xl shadow-2xl transition-transform hover:scale-105">
            <GraduationCap className="size-24 text-white" />
          </div>
        </div>
        <h1 className="text-7xl md:text-9xl font-headline font-black text-primary leading-tight tracking-tighter">
          STUDYFORGE
        </h1>
        <p className="text-3xl md:text-4xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed italic">
          Empowering your spiritual teaching with a modern, simple classroom.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
        <Button 
          onClick={() => router.push('/login')}
          size="lg" 
          className="flex-1 h-24 text-4xl font-black bg-primary hover:bg-primary/90 shadow-2xl rounded-3xl group transition-all"
        >
          START TEACHING
          <ArrowRight className="ml-4 size-10 transition-transform group-hover:translate-x-3" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-12 pt-16 border-t-2 w-full max-w-3xl justify-center grayscale opacity-50">
        <div className="flex items-center gap-3">
          <Video className="size-8" />
          <span className="text-2xl font-black uppercase">Jitsi Core</span>
        </div>
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-8" />
          <span className="text-2xl font-black uppercase">Secure Auth</span>
        </div>
      </div>
    </div>
  );
}
