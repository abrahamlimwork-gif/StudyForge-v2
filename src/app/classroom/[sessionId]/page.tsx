
"use client";

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, ShieldCheck } from 'lucide-react';

export default function ClassroomPage() {
  const { sessionId } = useParams();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [jitsiApi, setJitsiApi] = useState<any>(null);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (!user || !jitsiContainerRef.current) return;

    // Community-hosted Jitsi Server (meet.ffmuc.net)
    const domain = "meet.ffmuc.net";
    
    // Create a long, professional unique room name to avoid overlaps
    const uniqueRoomName = `StudyForge_Valenzuela_Main_Session_${sessionId}_2026`;

    const options = {
      roomName: uniqueRoomName,
      width: "100%",
      height: "100%",
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: user.displayName || user.email || "StudyForge Member",
        email: user.email,
      },
      configOverwrite: {
        startWithAudioMuted: true,
        startWithVideoMuted: false,
        disableDeepLinking: true,
        prejoinPageEnabled: false,
        enableWelcomePage: false,
        // Ensure no local recordings or other distracting features
        toolbarButtons: ['microphone', 'camera', 'chat', 'tileview', 'hangup'],
      },
      interfaceConfigOverwrite: {
        // Simplified UI for seniors
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'chat', 'tileview', 'hangup'
        ],
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DEFAULT_REMOTE_DISPLAY_NAME: 'Fellow Student',
        INITIAL_TOOLBAR_TIMEOUT: 20000,
        TOOLBAR_TIMEOUT: 4000,
      }
    };

    // Use the global JitsiMeetExternalAPI from layout.tsx script
    // @ts-ignore
    if (window.JitsiMeetExternalAPI) {
      const api = new window.JitsiMeetExternalAPI(domain, options);
      setJitsiApi(api);

      return () => {
        if (api) api.dispose();
      };
    } else {
      console.error("Jitsi Meet External API script not loaded. Check layout.tsx.");
    }
  }, [user, sessionId]);

  if (isUserLoading || !user) return null;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Navbar />
      
      {/* High-Visibility Senior-Friendly Header */}
      <div className="bg-white border-b px-8 py-6 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-8">
          <Button 
            variant="destructive" 
            size="lg" 
            className="text-2xl h-20 px-10 font-black shadow-lg hover:scale-105 transition-transform"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="mr-3 size-8 stroke-[3]" />
            LEAVE CLASS
          </Button>
          
          <div className="h-16 w-[3px] bg-slate-200" />
          
          <div className="flex flex-col">
            <h1 className="text-4xl font-headline font-black text-primary uppercase tracking-tight">
              Live Classroom
            </h1>
            <p className="text-xl text-muted-foreground font-bold">
              Topic: <span className="text-secondary">{String(sessionId).replace(/-/g, ' ')}</span>
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-3 bg-green-50 px-6 py-4 rounded-2xl border-2 border-green-200 text-green-700 font-black">
            <ShieldCheck className="size-8" />
            <span className="text-2xl">Secure Room</span>
          </div>
        </div>
      </div>

      {/* Full-Screen Video Area */}
      <main className="flex-grow relative bg-slate-950">
        <div 
          id="jitsi-container" 
          ref={jitsiContainerRef} 
          className="absolute inset-0 w-full h-full" 
        />
        
        {/* Loading fallback */}
        <div className="absolute inset-0 flex items-center justify-center -z-10">
          <p className="text-white text-3xl font-bold animate-pulse">
            Connecting to Live Session...
          </p>
        </div>
      </main>

      {/* Accessible Footer */}
      <footer className="bg-primary py-4 px-8 text-center text-primary-foreground border-t-4 border-secondary shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <p className="text-2xl font-black flex items-center justify-center gap-4">
          <Users className="size-8" />
          Everyone can see and hear you in this room.
        </p>
      </footer>
    </div>
  );
}
