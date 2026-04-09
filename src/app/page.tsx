
"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Video, Info, Loader2, ArrowLeft } from 'lucide-react';

/**
 * Immediate Video Test Page (8x8 Professional Edition)
 * Updated for JaaS (Jitsi as a Service) compatibility.
 */
export default function TestClassroomPage() {
  const router = useRouter();
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // YOUR_APP_ID from 8x8 Console
  const APP_ID = "vpaas-magic-cookie-studio-7696342024";
  const DOMAIN = "8x8.vc";
  
  // NOTE: For 8x8.vc, a JWT is required for production. 
  // For testing, you can generate a temporary one in the 8x8 console.
  const TEST_JWT = ""; 

  useEffect(() => {
    // Dynamically load the professional 8x8 Jitsi script
    const script = document.createElement('script');
    // The script URL for JaaS includes the App ID
    script.src = `https://${DOMAIN}/${APP_ID}/external_api.js`;
    script.async = true;
    script.onload = () => {
      console.log("8x8 Jitsi API script loaded");
      setIsScriptLoaded(true);
    };
    script.onerror = () => {
      console.error("Failed to load 8x8 Jitsi API script");
      setLoadError("The professional video service could not be reached. Check your App ID.");
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [APP_ID]);

  useEffect(() => {
    if (!isScriptLoaded || !jitsiContainerRef.current) return;

    // Unique room name with date/timestamp to prevent collisions
    const roomName = `StudyForge_Test_${new Date().getTime()}`;
    const fullRoomName = `${APP_ID}/${roomName}`;

    const options = {
      roomName: fullRoomName,
      jwt: TEST_JWT, // Pass the token here
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
        // Simplified Interface for Pro Sessions
        disableInvites: true,
        remoteVideoMenu: {
          disableKick: true,
        },
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
      setLoadError("Could not start the professional classroom. Please check your JWT or App ID.");
    }
  }, [isScriptLoaded, APP_ID, TEST_JWT]);

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      {/* High-Visibility Header for Seniors */}
      <div className="bg-white border-b px-8 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-6">
          <Button 
            variant="destructive" 
            size="lg" 
            className="text-2xl h-16 px-8 font-black shadow-md hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            <ArrowLeft className="mr-2 size-6 stroke-[3]" />
            LEAVE CLASS
          </Button>
          
          <div className="hidden sm:block">
            <h1 className="text-3xl font-headline font-black text-primary uppercase">
              StudyForge Pro Test (8x8)
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
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">System Notice</h2>
            <p className="text-xl text-slate-300 max-w-xl mx-auto">{loadError}</p>
            {!TEST_JWT && (
              <p className="text-sm text-yellow-400 font-bold uppercase">
                Note: 8x8 JaaS requires a JWT for connection.
              </p>
            )}
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
          <p className="text-lg text-muted-foreground font-medium">
            App ID: <span className="font-mono text-primary">{APP_ID}</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
