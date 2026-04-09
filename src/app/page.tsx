"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Video, Info, Loader2 } from 'lucide-react';

/**
 * Immediate Video Test Page
 * Bypasses Login to verify Jitsi integration at meet.jit.si
 */
export default function TestClassroomPage() {
  const router = useRouter();
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [jitsiApi, setJitsiApi] = useState<any>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Dynamically load Jitsi script for better reliability in Next.js
    const script = document.createElement('script');
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => {
      console.log("Jitsi API script loaded");
      setIsScriptLoaded(true);
    };
    script.onerror = () => {
      console.error("Failed to load Jitsi API script");
      setLoadError("The video service could not be reached. Please check your internet connection.");
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (!isScriptLoaded || !jitsiContainerRef.current) return;

    // Configuration for meet.jit.si (100% Free Public Server)
    const domain = "meet.jit.si";
    const uniqueRoomName = "StudyForge_IBS_Valenzuela_Main_2026";

    const options = {
      roomName: uniqueRoomName,
      width: "100%",
      height: "100%",
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: "Teacher Assistant (Test)",
        email: "test@studyforge.com",
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
      const api = new window.JitsiMeetExternalAPI(domain, options);
      setJitsiApi(api);

      return () => {
        if (api) api.dispose();
      };
    } catch (error) {
      console.error("Jitsi initialization error:", error);
      setLoadError("Could not start the video classroom. Please refresh.");
    }
  }, [isScriptLoaded]);

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      {/* Test Header */}
      <div className="bg-primary text-white px-8 py-4 flex items-center justify-between shadow-lg z-10">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-2 rounded-lg">
            <Video className="size-8" />
          </div>
          <div>
            <h1 className="text-3xl font-headline font-black uppercase tracking-tight">
              StudyForge Live Test
            </h1>
            <p className="text-sm opacity-80 font-bold uppercase tracking-widest">
              meet.jit.si • IBS Valenzuela 2026
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-full border border-green-500/30 text-green-300 font-bold">
            <ShieldCheck className="size-5" />
            <span>Secure Connection</span>
          </div>
          <Button 
            variant="secondary" 
            size="lg" 
            className="text-xl h-14 px-8 font-black shadow-md hover:bg-white"
            onClick={() => window.location.reload()}
          >
            REFRESH CALL
          </Button>
        </div>
      </div>

      {/* Video Area - 80% height as requested */}
      <main className="w-full relative bg-slate-900" style={{ height: '80vh' }}>
        <div 
          id="jitsi-container" 
          ref={jitsiContainerRef} 
          className="w-full h-full border-b-4 border-primary/20" 
        />
        
        {(!isScriptLoaded && !loadError) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-20 space-y-6">
            <Loader2 className="size-20 animate-spin text-secondary" />
            <p className="text-white text-3xl font-black font-headline uppercase tracking-wide">
              Connecting to Classroom...
            </p>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-20 p-8 text-center space-y-8">
            <Info className="size-24 text-destructive" />
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-white uppercase tracking-tight">System Notice</h2>
              <p className="text-2xl text-slate-300 max-w-xl mx-auto font-medium">{loadError}</p>
            </div>
            <Button 
              size="lg" 
              className="h-20 px-12 text-3xl font-bold bg-secondary hover:bg-secondary/90" 
              onClick={() => window.location.reload()}
            >
              TRY AGAIN
            </Button>
          </div>
        )}
      </main>

      {/* Info Footer for Seniors */}
      <footer className="flex-grow bg-white flex items-center justify-center p-8 border-t-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-5xl w-full flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-4xl font-black text-primary uppercase">Classroom Live</h2>
            <p className="text-2xl text-slate-600 font-medium">
              Connected to: <span className="text-secondary font-bold underline">IBS Valenzuela 2026</span>
            </p>
          </div>
          
          <div className="bg-blue-50 p-8 rounded-3xl border-4 border-blue-100 flex items-start gap-6 max-w-lg shadow-sm">
            <Info className="size-10 text-blue-600 shrink-0 mt-1" />
            <div className="space-y-2">
              <p className="font-black text-blue-900 text-2xl uppercase tracking-tight">Important Reminder:</p>
              <p className="text-blue-800 leading-relaxed font-bold text-xl">
                Please click the <span className="text-blue-600">"Allow"</span> button at the top of your screen for camera and microphone access.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
