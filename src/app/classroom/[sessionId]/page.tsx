
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
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
  AlertTriangle,
  Maximize2,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GoogleDriveExplorer } from '@/components/google-drive-explorer';
import { generateSermonSlides } from '@/ai/flows/generate-sermon-slides';
import { createGoogleSlides, addSlidesContent } from '@/lib/google-api-utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function PresenterDashboard() {
  const { sessionId } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const [hasCopied, setHasCopied] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkStatus = () => {
      const token = localStorage.getItem('google_access_token');
      setIsGoogleConnected(!!token);
    };
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // Use /embed which is more reliable for iframe usage
  const slidesUrl = selectedFileId 
    ? `https://docs.google.com/presentation/d/${selectedFileId}/embed?start=false&loop=false&delayms=3000` 
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
      toast({ variant: 'destructive', title: 'Connection Required', description: 'Please connect Google Drive in the sidebar first.' });
      return;
    }

    try {
      setIsGenerating(true);
      toast({ title: "Thinking...", description: "AI is outlining your sermon now." });
      
      const data = await generateSermonSlides({ 
        topic: "The Power of Grace", 
        scripture: "Ephesians 2:8" 
      });
      
      const presentation = await createGoogleSlides(token, `AI Sermon: ${data.title}`);
      await addSlidesContent(token, presentation.presentationId, data.slides);
      
      setSelectedFileId(presentation.presentationId);
      setRefreshKey(prev => prev + 1);
      
      toast({ title: "Sermon Ready!", description: "AI presentation created and saved to your Drive." });
    } catch (err: any) {
      console.error("AI Slide Gen Error:", err);
      
      let errorMessage = "Failed to sync slides to Drive.";
      if (err.message?.includes('503') || err.message?.includes('high demand')) {
        errorMessage = "AI is currently very busy. Please wait a moment and try again.";
      } else if (err.message?.includes('404')) {
        errorMessage = "The AI model is temporarily unavailable. Please try again shortly.";
      }

      toast({ 
        variant: 'destructive', 
        title: 'Automation Failed', 
        description: errorMessage 
      });
    } finally {
      setIsGenerating(false);
    }
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
          {isGoogleConnected && (
            <Button 
              onClick={handleAISermonGen} 
              disabled={isGenerating}
              variant="outline" 
              className="border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 h-12 px-6 font-black text-xs tracking-widest rounded-xl"
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              AI AUTO-GEN SLIDES
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

          {user && (
            <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
              <Avatar className="size-8">
                <AvatarImage src={user.photoURL || undefined} />
                <AvatarFallback className="bg-blue-600 text-white text-[10px] font-black">
                  {user.displayName?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
      </header>

      <main className="flex-grow flex overflow-hidden">
        
        <aside className="w-1/4 min-w-[350px] border-r border-white/5 bg-slate-900 flex flex-col overflow-hidden">
          <GoogleDriveExplorer key={refreshKey} onFileSelect={setSelectedFileId} />
        </aside>

        <section className="flex-grow border-r border-white/5 bg-black flex flex-col relative overflow-hidden">
          {slidesUrl ? (
            <>
              <div className="absolute top-6 right-6 z-[60] flex gap-3">
                <Button 
                  onClick={() => window.open(`https://docs.google.com/presentation/d/${selectedFileId}/present`, '_blank')}
                  variant="secondary"
                  className="bg-blue-600/90 hover:bg-blue-600 text-white font-black border-none h-12 px-6 rounded-xl shadow-2xl"
                >
                  <Maximize2 className="mr-2 h-4 w-4" /> FULLSCREEN
                </Button>
              </div>
              
              <iframe 
                src={slidesUrl}
                className="w-full h-full border-none"
                allowFullScreen
                allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              />

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[60] w-full max-w-lg">
                <Alert className="bg-black/80 backdrop-blur-md border-blue-500/20 text-white">
                  <Info className="h-4 w-4 text-blue-400" />
                  <AlertTitle className="text-[10px] font-black uppercase tracking-widest text-blue-400">Loading Tips</AlertTitle>
                  <AlertDescription className="text-[9px] font-bold text-white/60">
                    If you see "Unable to open file", ensure you are logged into Google in this browser and allow third-party cookies for Google Drive.
                  </AlertDescription>
                </Alert>
              </div>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-12 space-y-8">
              <div className="p-10 bg-slate-900 rounded-[3rem] border border-white/5">
                <Monitor className="size-24 text-white/5" />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-black text-white/20 uppercase tracking-[0.2em]">
                  Waiting for Slide
                </h3>
                <p className="text-lg text-white/10 max-w-sm italic font-medium">
                  {isGoogleConnected 
                    ? "Generate an AI sermon or select a file from the library to begin."
                    : "Connect your Workspace in the sidebar to sync your sermon library."}
                </p>
              </div>
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
          StudyForge v3.5 • GenAI Slides Powered
        </div>
      </footer>
    </div>
  );
}
