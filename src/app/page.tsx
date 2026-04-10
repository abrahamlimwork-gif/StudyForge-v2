
"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, GraduationCap, LayoutDashboard } from 'lucide-react';
import { generateRandomRoomName } from '@/lib/room-utils';

export default function LandingPage() {
  const router = useRouter();

  const startTestSession = () => {
    const roomName = generateRandomRoomName();
    router.push(`/classroom/${roomName}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-16">
      <div className="space-y-6 max-w-4xl">
        <div className="flex justify-center mb-8">
          <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-[0_0_100px_rgba(37,99,235,0.2)] transition-transform hover:scale-105">
            <GraduationCap className="size-28 text-white" />
          </div>
        </div>
        <h1 className="text-8xl md:text-9xl font-black text-white leading-tight tracking-tighter uppercase">
          STUDY<span className="text-blue-600">FORGE</span>
        </h1>
        <p className="text-2xl md:text-3xl text-slate-400 font-bold max-w-3xl mx-auto leading-relaxed italic">
          Professional workspace for church learning and live sermon delivery.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-8 w-full max-w-3xl">
        <Button 
          onClick={startTestSession}
          size="lg" 
          className="flex-1 h-28 text-4xl font-black bg-white text-slate-950 hover:bg-slate-100 shadow-2xl rounded-[2rem] group transition-all"
        >
          OPEN HUD
          <ArrowRight className="ml-4 size-10 transition-transform group-hover:translate-x-3" />
        </Button>
        
        <Button 
          onClick={() => router.push('/dashboard')}
          variant="outline"
          className="flex-1 h-28 text-4xl font-black border-white/10 text-white/50 hover:text-white hover:bg-white/5 rounded-[2rem]"
        >
          <LayoutDashboard className="mr-4 size-10" />
          DASHBOARD
        </Button>
      </div>

      <div className="text-[12px] font-black text-slate-600 uppercase tracking-[0.5em] italic">
        v3.5 Workspace HUD • Production Ready
      </div>
    </div>
  );
}
