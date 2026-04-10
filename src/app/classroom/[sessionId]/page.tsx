
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Check, 
  Share2, 
  ExternalLink, 
  Monitor, 
  BookOpen,
  Clock,
  Sparkles,
  Loader2,
  LogIn
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GoogleDriveExplorer } from '@/components/google-drive-explorer';
import { generateSermonSlides } from '@/ai/flows/generate-sermon-slides';
import { createGoogleSlides } from '@/lib/google-api-utils';

export default function PresenterDashboard() {
  const { sessionId } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  const [hasCopied, setHasCopied] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('google_access_token');
    setIsGoogleConnected(!!user && !!token);
  }, [user]);

  const slidesUrl = selectedFileId 
    ? `https://docs.google.com/presentation/d/${selectedFileId}/presenter` 
    : null;

  const roomName = typeof sessionId === 'string' ? sessionId : 'TestSession';
  const jitsiUrl = `https://meet.jit.si/${roomName}`;

  const copyInviteLink = () => {
    navigator.clipboard.writeText(jitsiUrl);
    setHasCopied(true);
    toast({ title: "Invite Link Copied!", description: "Share this URL with your participants." });
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleAISermonGen = async () => {
    const token = localStorage.getItem('google_access_token');
    if (!token) {
      toast({ variant: 'destructive', title: 'Auth Error', description: 'Please log in again to sync with Drive.' });
      return;
    }

    try {
      setIsGenerating(true);
      const data = await generateSermonSlides({ topic: "The Power of Grace" });
      const presentation = await createGoogleSlides(token, data.title);
      setSelectedFileId(presentation.presentationId);
      toast({ title: "Sermon Created!", description: "Your AI presentation is ready in Google Drive." });
    } catch (err) {
      toast({ variant: 'destructive', title: 'AI Error', description: 'Failed to generate sermon slides.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-slate-950/50 backdrop-blur-md z-50 shrink-0">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="hover:bg-white/10 text-white/70">
            <ArrowLeft className="mr-2 h-4 w-4" /> Exit
          </Button>
          <div className="h-4 w-px bg-white/10" />
          <h1 className="text-lg font-black tracking-tighter uppercase flex items-center gap-2">
            <Monitor className="h-5 w-5 text-blue-400" />
            <span>Presenter HUD</span>
            {isGoogleConnected ? (
              <span className="text-xs font-mono bg-green-500/20 text-green-400 px-2 py-0.5 rounded ml-2">GOOGLE CONNECTED</span>
            ) : (
              <span className="text-xs font-mono bg-red-500/20 text-red-400 px-2 py-0.5 rounded ml-2">DISCONNECTED</span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {isGoogleConnected ? (
            <Button 
              onClick={handleAISermonGen} 
              disabled={isGenerating}
              variant="outline" 
              className="border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 h-10 px-4 font-black text-xs tracking-widest"
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              AI SERMON GEN
            </Button>
          ) : (
            <Button 
              onClick={handleLogin}
              variant="default"
              className="bg-primary text-primary-foreground h-10 px-4 font-black text-xs tracking-widest"
            >
              <LogIn className="mr-2 h-4 w-4" />
              SIGN IN TO UNLOCK AI
            </Button>
          )}

          <div className="hidden md:flex items-center gap-2 text-sm font-mono text-white/40 mr-4">
            <Clock className="h-4 w-4" /> {currentTime || '--:--:--'}
          </div>
          
          <Button onClick={copyInviteLink} variant="outline" className="border-white/20 hover:bg-white/10 h-10 px-4 font-bold">
            {hasCopied ? <Check className="mr-2 h-4 w-4 text-green-400" /> : <Share2 className="mr-2 h-4 w-4" />}
            {hasCopied ? "COPIED" : "INVITE LINK"}
          </Button>

          <Button 
            onClick={() => window.open(jitsiUrl, '_blank')} 
            className="bg-blue-600 hover:bg-blue-500 text-white font-black h-10 px-6 shadow-lg shadow-blue-500/20"
          >
            <ExternalLink className="mr-2 h-4 w-4" /> LAUNCH JITSI
          </Button>
        </div>
      </header>

      <main className="flex-grow flex overflow-hidden">
        
        <aside className="w-1/4 min-w-[320px] border-r border-white/5 bg-slate-950/20 flex flex-col overflow-hidden">
          <GoogleDriveExplorer onFileSelect={setSelectedFileId} />
        </aside>

        <section className="flex-grow border-r border-white/5 bg-black flex flex-col relative overflow-hidden">
          {slidesUrl ? (
            <iframe 
              src={slidesUrl}
              className="w-full h-full border-none shadow-2xl"
              allowFullScreen
            />
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-12 space-y-4">
              <div className="p-6 bg-slate-900 rounded-full">
                <Monitor className="size-16 text-white/10" />
              </div>
              <h3 className="text-xl font-black text-white/40 uppercase tracking-widest">
                {isGoogleConnected ? "No Presentation Selected" : "Sign In Required"}
              </h3>
              <p className="text-sm text-white/20 max-w-xs italic">
                {isGoogleConnected 
                  ? "Select a file from your Google Drive on the left or use AI to generate a new sermon presentation."
                  : "Please connect your Google account to access your slides and AI sermon generation features."}
              </p>
              {!isGoogleConnected && (
                <Button onClick={handleLogin} variant="outline" className="mt-4 border-white/20 text-white/60 hover:text-white">
                  Connect Workspace
                </Button>
              )}
            </div>
          )}
        </section>

        <aside className="w-1/4 min-w-[320px] bg-slate-950 flex flex-col overflow-hidden relative">
          <div className="p-5 border-b border-white/5 bg-slate-900/50 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Scripture Engine
            </h2>
          </div>
          <div className="flex-grow w-full bg-white h-full">
            <iframe 
              src="https://www.biblegateway.com"
              className="w-full h-full border-none"
              scrolling="yes"
              title="BibleGateway Native UI"
            />
          </div>
        </aside>

      </main>

      <footer className="h-10 bg-black border-t border-white/5 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4 text-[10px] font-mono text-white/20 uppercase tracking-widest">
          <span className="flex items-center gap-1.5">
            <div className={`h-1.5 w-1.5 ${isGoogleConnected ? 'bg-green-500' : 'bg-red-500'} rounded-full animate-pulse`} />
            {isGoogleConnected ? "Google Workspace Synchronized" : "Google Connection Pending"}
          </span>
          <span className="opacity-50">|</span>
          <span>Room: {roomName}</span>
        </div>
        <div className="text-[10px] font-bold text-white/10 uppercase italic">
          StudyForge Google-Edition v3.0
        </div>
      </footer>
    </div>
  );
}
