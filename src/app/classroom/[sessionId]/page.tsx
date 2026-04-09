
"use client";

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, MessageSquare } from 'lucide-react';

export default function ClassroomPage() {
  const { sessionId } = useParams();
  const { user, loading } = useAuth();
  const router = useRouter();
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [jitsiApi, setJitsiApi] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !jitsiContainerRef.current) return;

    // Jitsi meet integration
    const domain = "meet.jit.si";
    const options = {
      roomName: `StudyForge-${sessionId}`,
      width: "100%",
      height: "100%",
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: user.displayName || user.email || "Student",
        email: user.email,
      },
      configOverwrite: {
        startWithAudioMuted: true,
        disableDeepLinking: true,
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
          'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
          'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
          'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
          'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
          'security'
        ],
      }
    };

    // @ts-ignore
    const api = new window.JitsiMeetExternalAPI(domain, options);
    setJitsiApi(api);

    return () => {
      if (api) api.dispose();
    };
  }, [user, sessionId]);

  if (loading || !user) return null;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Navbar />
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <Button 
            variant="ghost" 
            size="lg" 
            className="text-xl font-bold"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="mr-2 size-6" />
            Exit Classroom
          </Button>
          <div className="h-10 w-[2px] bg-border" />
          <h1 className="text-3xl font-headline font-bold text-primary">
            Live Session: <span className="text-secondary">{sessionId}</span>
          </h1>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-lg text-primary font-bold">
            <Users className="size-6" />
            <span className="text-xl">Interactive Session</span>
          </div>
        </div>
      </div>

      <main className="flex-grow relative bg-slate-900">
        <div id="jitsi-container" ref={jitsiContainerRef} className="absolute inset-0 w-full h-full" />
      </main>

      <footer className="bg-primary py-3 px-6 text-center text-primary-foreground">
        <p className="text-xl font-medium">Classroom audio and video are encrypted for your privacy.</p>
      </footer>
    </div>
  );
}
