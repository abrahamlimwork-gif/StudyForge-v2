"use client";

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck, Loader2, Info } from 'lucide-react';

export default function ClassroomPage() {
  const { sessionId } = useParams();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Replace 'YOUR_APP_ID' with your actual 8x8 App ID
  const APP_ID = "vpaas-magic-cookie-studio-7696342024";
  const DOMAIN = "8x8.vc";

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    // Dynamically load professional 8x8 Jitsi script
    const script = document.createElement('script');
    script.src = `https://${DOMAIN}/${APP_ID}/external_api.js`;
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    script.onerror = () => setLoadError("Could not load the professional video service.");
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [APP_ID]);

  useEffect(() => {
    if (!user || !isScriptLoaded || !jitsiContainerRef.current) return;

    // Sanitize room name and prefix with App ID for 8x8
    const cleanSessionId = typeof sessionId === 'string' ? sessionId.replace(/\s+/g, '_') : 'DefaultSession';
    const roomName = `StudyForge_${cleanSessionId}_2026`;
    const fullRoomName = `${APP_ID}/${roomName}`;

    const options = {
      roomName: fullRoomName,
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

    try {
      // @ts-ignore
      const api = new window.JitsiMeetExternalAPI(DOMAIN, options);

      return () => {
        if (api) api.dispose();
      };
    } catch (error) {
      console.error("Jitsi initialization error:", error);
      setLoadError("Failed to initialize professional classroom video.");
    }
  }, [user, isScriptLoaded, sessionId, APP_ID]);

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
              Live Classroom (Pro)
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-green-50 px-4 py-2 rounded-xl border border-green-200 text-green-700 font-bold">
          <ShieldCheck className="size-6" />
          <span className="text-xl">Secure Session</span>
        </div>
      </div>

      {/* Video Area */}
      <main className="w-full relative bg-black" style={{ height: '80vh' }}>
        <div 
          id="jitsi-container" 
          ref={jitsiContainerRef} 
          className="w-full h-full" 
        />
        
        {(!isScriptLoaded && !loadError) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-20 space-y-4">
            <Loader2 className="size-16 animate-spin text-secondary" />
            <p className="text-white text-2xl font-bold uppercase">Preparing Pro Video...</p>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-20 p-8 text-center space-y-6">
            <Info className="size-20 text-destructive" />
            <h2 className="text-3xl font-black text-white uppercase">Connection Error</h2>
            <p className="text-xl text-slate-300">{loadError}</p>
            <Button size="lg" className="h-16 px-10 text-2xl font-bold" onClick={() => window.location.reload()}>
              RETRY
            </Button>
          </div>
        )}
      </main>

      <footer className="flex-grow bg-slate-50 flex items-center justify-center p-6 border-t">
        <div className="text-center space-y-2">
          <p className="text-2xl font-bold text-slate-700 uppercase">
            Managed 8x8 Professional Session
          </p>
          <p className="text-lg text-muted-foreground">
            Please ensure your camera and microphone are allowed.
          </p>
        </div>
      </footer>
    </div>
  );
}
