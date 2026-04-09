"use client";

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

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

    // Use vpaas.jitsi.net as requested
    const domain = "vpaas.jitsi.net";
    
    // Fixed unique room name as requested
    const uniqueRoomName = "StudyForge_IBS_Valenzuela_2026";

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
        toolbarButtons: ['microphone', 'camera', 'chat', 'tileview', 'hangup'],
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DEFAULT_REMOTE_DISPLAY_NAME: 'Fellow Student',
        TOOLBAR_TIMEOUT: 4000,
      }
    };

    // @ts-ignore
    if (window.JitsiMeetExternalAPI) {
      const api = new window.JitsiMeetExternalAPI(domain, options);
      setJitsiApi(api);

      return () => {
        if (api) api.dispose();
      };
    }
  }, [user, sessionId]);

  if (isUserLoading || !user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <Navbar />
      
      {/* High-Visibility Header for Seniors */}
      <div className="bg-white border-b px-8 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-6">
          <Button 
            variant="destructive" 
            size="lg" 
            className="text-2xl h-16 px-8 font-black shadow-md hover:bg-red-700"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="mr-2 size-6 stroke-[3]" />
            LEAVE CLASS
          </Button>
          
          <div className="hidden sm:block">
            <h1 className="text-3xl font-headline font-black text-primary uppercase">
              Live Classroom
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-green-50 px-4 py-2 rounded-xl border border-green-200 text-green-700 font-bold">
          <ShieldCheck className="size-6" />
          <span className="text-xl">Secure Session</span>
        </div>
      </div>

      {/* Video Area - 80% of viewport height as requested */}
      <main className="w-full relative bg-black" style={{ height: '80vh' }}>
        <div 
          id="jitsi-container" 
          ref={jitsiContainerRef} 
          className="w-full h-full" 
        />
        
        {/* Loading fallback */}
        <div className="absolute inset-0 flex items-center justify-center -z-10">
          <p className="text-white text-2xl font-bold animate-pulse">
            Starting video session...
          </p>
        </div>
      </main>

      {/* Info Footer */}
      <footer className="flex-grow bg-slate-50 flex items-center justify-center p-6 border-t">
        <div className="text-center space-y-2">
          <p className="text-2xl font-bold text-slate-700">
            You are currently in the IBS Valenzuela Room
          </p>
          <p className="text-lg text-muted-foreground">
            Please ensure your camera and microphone are allowed.
          </p>
        </div>
      </footer>
    </div>
  );
}
