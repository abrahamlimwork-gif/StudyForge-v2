"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Video, ArrowRight, ShieldCheck, GraduationCap } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-12">
      <div className="space-y-4 max-w-3xl">
        <div className="flex justify-center mb-6">
          <div className="bg-primary p-6 rounded-3xl shadow-xl">
            <GraduationCap className="size-20 text-white" />
          </div>
        </div>
        <h1 className="text-6xl md:text-8xl font-headline font-black text-primary leading-tight">
          StudyForge
        </h1>
        <p className="text-2xl md:text-3xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
          The simple, powerful platform for spiritual teaching and group learning.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-xl">
        <Button 
          onClick={() => router.push('/login')}
          size="lg" 
          className="flex-1 h-20 text-3xl font-black bg-primary hover:bg-primary/90 shadow-lg rounded-2xl group"
        >
          START TEACHING
          <ArrowRight className="ml-3 size-8 transition-transform group-hover:translate-x-2" />
        </Button>
      </div>

      <div className="flex items-center gap-8 pt-12 border-t w-full max-w-2xl justify-center grayscale opacity-60">
        <div className="flex items-center gap-2">
          <Video className="size-6" />
          <span className="text-xl font-bold">Public Jitsi Integration</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-6" />
          <span className="text-xl font-bold">Zero-Cost Setup</span>
        </div>
      </div>
    </div>
  );
}
