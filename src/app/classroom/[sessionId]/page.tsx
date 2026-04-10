
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
  LogIn,
  User as UserIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GoogleDriveExplorer } from '@/components/google-drive-explorer';
import { generateSermonSlides } from '@/ai/flows/generate-sermon-slides';
import { createGoogleSlides } from '@/lib/google-api-utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
      
      <header className="h-24 border-b border-white/10 flex items-center justify-between px-8 bg-slate-950 z-50 shrink-0">
        <div className="flex items-center gap-8">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="hover:bg-white/10 text-white/50 h-12 px-6 font-bold uppercase tracking-widest text-xs">
            <ArrowLeft className="mr-2 h-4 w-4" /> Exit
          </Button>
          <div className="h-8 w-px bg-white/10" />
          <h1 className="text-xl font-black tracking-tighter uppercase flex items-center gap-3">
            <Monitor className="h-6 w-6 text-blue-400" />
            <span>Presenter HUD</span>
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
            <Avatar className="size-10 border-2 border-blue-500/50">
              <AvatarImage src={user?.photoURL || undefined} />
              <AvatarFallback className="bg-blue-600 text-white font-black">
                {user?.displayName?.[0] || 'G'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Host</span>
              <span className="text-sm font-bold text-white truncate max-w-[150px]">
                {user?.displayName || "Guest Presenter"}
              </span>
            </div>
          </div>

          <div className="h-8 w-px bg-white/10" />

          {isGoogleConnected ? (
            <Button 
              onClick={handleAISermonGen} 
              disabled={isGenerating}
              variant="outline" 
              className="border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 h-12 px-6 font-black text-xs tracking-widest rounded-xl"
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              AI SERMON GEN
            </Button>
          ) : (
            <Button 
              onClick={handleLogin}
              variant="default"
              className="bg-primary text-primary-foreground h-12 px-6 font-black text-xs tracking-widest rounded-xl"
            >
              <LogIn className="mr-2 h-4 w-4" />
              CONNECT GOOGLE
            </Button>
          )}

          <Button onClick={copyInviteLink} variant="outline" className="border-white/10 hover:bg-white/5 h-12 px-6 font-bold text-xs tracking-widest rounded-xl">
            {hasCopied ? <Check className="mr-2 h-4 w-4 text-green-400" /> : <Share2 className="mr-2 h-4 w-4" />}
            {hasCopied ? "COPIED" : "INVITE"}
          </Button>

          <Button 
            onClick={() => window.open(jitsiUrl, '_blank')} 
            className="bg-blue-600 hover:bg-blue-500 text-white font-black h-12 px-8 shadow-xl shadow-blue-500/20 rounded-xl"
          >
            <ExternalLink className="mr-2 h-4 w-4" /> LAUNCH CALL
          </Button>
        </div>
      </header>

      <main className="flex-grow flex overflow-hidden">
        
        <aside className="w-1/4 min-w-[350px] border-r border-white/5 bg-slate-900 flex flex-col overflow-hidden">
          <GoogleDriveExplorer onFileSelect={setSelectedFileId} />
        </aside>

        <section className="flex-grow border-r border-white/5 bg-black flex flex-col relative overflow-hidden">
          {slidesUrl ? (
            <iframe 
              src={slidesUrl}
              className="w-full h-full border-none"
              allowFullScreen
            />
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-12 space-y-6">
              <div className="p-10 bg-slate-900 rounded-[3rem] border border-white/5">
                <Monitor className="size-24 text-white/5" />
              </div>
              <h3 className="text-3xl font-black text-white/20 uppercase tracking-widest">
                {isGoogleConnected ? "Waiting for Selection" : "Connection Required"}
              </h3>
              <p className="text-lg text-white/10 max-w-sm italic">
                {isGoogleConnected 
                  ? "Select a presentation from your Drive to begin the HUD broadcast."
                  : "Sign in to synchronize your Google Slides and unlock AI-powered features."}
              </p>
              {!isGoogleConnected && (
                <Button onClick={handleLogin} variant="outline" className="h-14 px-10 border-white/10 text-white/50 hover:text-white rounded-2xl">
                  Log in to Workspace
                </Button>
              )}
            </div>
          )}
        </section>

        <aside className="w-1/4 min-w-[350px] bg-slate-950 flex flex-col overflow-hidden relative">
          <div className="p-6 border-b border-white/5 bg-slate-900/50 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-white/30 flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-blue-400" /> Reference
            </h2>
          </div>
          <div className="flex-grow w-full bg-white h-full">
            <iframe 
              src="https://www.biblegateway.com"
              className="w-full h-full border-none"
              scrolling="yes"
              title="Bible Reference"
            />
          </div>
        </aside>

      </main>

      <footer className="h-12 bg-black border-t border-white/5 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-6 text-[11px] font-mono text-white/30 uppercase tracking-widest">
          <span className="flex items-center gap-2">
            <div className={`h-2 w-2 ${isGoogleConnected ? 'bg-green-500' : 'bg-red-500'} rounded-full animate-pulse`} />
            {isGoogleConnected ? "Workspace Synchronized" : "Workspace Pending"}
          </span>
          <span className="opacity-30">|</span>
          <span className="flex items-center gap-2">
            <Clock className="h-3 w-3" /> {currentTime || '--:--:--'}
          </span>
        </div>
        <div className="text-[11px] font-black text-white/10 uppercase italic tracking-widest">
          StudyForge v3.0 Google-HUD
        </div>
      </footer>
    </div>
  );
}
