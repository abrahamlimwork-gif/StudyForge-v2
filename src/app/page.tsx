"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Video, ArrowRight, GraduationCap } from 'lucide-react';
import { generateRandomRoomName } from '@/lib/room-utils';

export default function LandingPage() {
  const router = useRouter();

  const startTestSession = () => {
    const roomName = generateRandomRoomName();
    router.push(`/classroom/${roomName}`);
  };

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
          Auth-free testing mode enabled. Click below to enter the classroom.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
        <Button 
          onClick={startTestSession}
          size="lg" 
          className="flex-1 h-24 text-4xl font-black bg-primary hover:bg-primary/90 shadow-2xl rounded-3xl group transition-all"
        >
          ENTER CLASSROOM
          <ArrowRight className="ml-4 size-10 transition-transform group-hover:translate-x-3" />
        </Button>
      </div>

      <div className="flex items-center gap-3 grayscale opacity-50">
        <Video className="size-8" />
        <span className="text-2xl font-black uppercase">Jitsi Public Core</span>
      </div>
    </div>
  );
}
