
"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Video, Info } from 'lucide-react';

/**
 * Temporary Root Page for Immediate Video Testing
 * Bypasses Login/Landing to test Jitsi integration at vpaas.jitsi.net
 */
export default function TestClassroomPage() {
  const router = useRouter();
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [jitsiApi, setJitsiApi] = useState<any>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    // Check if the Jitsi script is already loaded from layout.tsx
    const checkScript = () => {
      // @ts-ignore
      if (window.JitsiMeetExternalAPI) {
        setIsScriptLoaded(true);
      } else {
        setTimeout(checkScript, 500);
      }
    };
    checkScript();
  }, []);

  useEffect(() => {
    if (!isScriptLoaded || !jitsiContainerRef.current) return;

    // Configuration for vpaas.jitsi.net as requested
    const domain = "vpaas.jitsi.net";
    const uniqueRoomName = "StudyForge_IBS_Valenzuela_2026";

    const options = {
      roomName: uniqueRoomName,
      width: "100%",
      height: "100%",
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: "Tester User",
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
              vpaas.jitsi.net • IBS Valenzuela 2026
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
            className="text-xl h-14 px-8 font-black shadow-md"
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
        
        {!isScriptLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-20 space-y-4">
            <div className="size-16 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
            <p className="text-white text-2xl font-bold">
              Loading Video Service...
            </p>
          </div>
        )}
      </main>

      {/* Info Footer for Seniors */}
      <footer className="flex-grow bg-white flex items-center justify-center p-8 border-t-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl w-full flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left">
            <h2 className="text-3xl font-black text-primary">Classroom is Ready</h2>
            <p className="text-xl text-slate-600 font-medium">
              You are currently testing the <span className="text-secondary font-bold">StudyForge_IBS_Valenzuela_2026</span> room.
            </p>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-2xl border-2 border-blue-100 flex items-start gap-4 max-w-md">
            <Info className="size-8 text-blue-600 shrink-0 mt-1" />
            <div className="space-y-1">
              <p className="font-bold text-blue-900 text-lg">Senior Reminder:</p>
              <p className="text-blue-800 leading-relaxed font-medium">
                Make sure to click <strong>"Allow"</strong> if your browser asks for camera or microphone access.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
