
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Check, 
  Share2, 
  Monitor, 
  BookOpen,
  Clock,
  Sparkles,
  Loader2,
  Maximize2,
  Info,
  ChevronLeft,
  ChevronRight,
  FileText,
  Radio,
  Gamepad2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GoogleDriveExplorer } from '@/components/google-drive-explorer';
import { generateSermonSlides } from '@/ai/flows/generate-sermon-slides';
import { createGoogleSlides, addSlidesContent, fetchSpeakerNotes } from '@/lib/google-api-utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [speakerNotes, setSpeakerNotes] = useState<string[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loadingNotes, setLoadingNotes] = useState(false);

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

  // Fetch speaker notes when a file is selected
  useEffect(() => {
    if (selectedFileId && isGoogleConnected) {
      const token = localStorage.getItem('google_access_token');
      if (token) {
        setLoadingNotes(true);
        fetchSpeakerNotes(token, selectedFileId)
          .then(notes => {
            setSpeakerNotes(notes);
            setCurrentSlideIndex(0);
          })
          .catch(err => {
            console.error("Notes Error:", err);
            setSpeakerNotes([]);
          })
          .finally(() => setLoadingNotes(false));
      }
    } else {
      setSpeakerNotes([]);
      setCurrentSlideIndex(0);
    }
  }, [selectedFileId, isGoogleConnected]);

  // Sync the iframe URL with the current slide index
  const slidesUrl = useMemo(() => {
    if (!selectedFileId) return null;
    // We use slide=id.p[N] where N is slide number (1-based)
    return `https://docs.google.com/presentation/d/${selectedFileId}/embed?start=false&loop=false&delayms=3000&slide=id.p${currentSlideIndex + 1}`;
  }, [selectedFileId, currentSlideIndex]);

  const roomName = typeof sessionId === 'string' ? sessionId : 'TestSession';
  const jitsiUrl = `https://meet.jit.si/${roomName}`;

  const copyInviteLink = () => {
    navigator.clipboard.writeText(jitsiUrl);
    setHasCopied(true);
    toast({ title: "Invite Link Copied!", description: "Share this URL with your participants." });
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleLaunchAudience = () => {
    if (selectedFileId) {
      window.open(`https://docs.google.com/presentation/d/${selectedFileId}/present?start=true&slide=id.p${currentSlideIndex + 1}`, '_blank');
      toast({ title: "Audience Window Launched", description: "The presentation is now open in a separate tab." });
    }
  };

  const goToNextSlide = () => {
    if (currentSlideIndex < speakerNotes.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const goToPrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
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
      toast({ 
        variant: 'destructive', 
        title: 'Automation Failed', 
        description: "Failed to sync slides to Drive. Please try again." 
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
          {selectedFileId && (
            <Button 
              onClick={handleLaunchAudience}
              className="bg-red-600 hover:bg-red-500 text-white font-black h-12 px-8 shadow-xl shadow-red-500/20 rounded-xl animate-pulse"
            >
              <Radio className="mr-2 h-4 w-4" /> LIVE AUDIENCE VIEW
            </Button>
          )}

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
                  onClick={() => window.open(`https://docs.google.com/presentation/d/${selectedFileId}/present#slide=id.p${currentSlideIndex + 1}`, '_blank')}
                  variant="secondary"
                  className="bg-blue-600/90 hover:bg-blue-600 text-white font-black border-none h-12 px-6 rounded-xl shadow-2xl"
                >
                  <Maximize2 className="mr-2 h-4 w-4" /> POP OUT
                </Button>
              </div>
              
              <div className="flex-grow relative">
                <iframe 
                  src={slidesUrl}
                  className="w-full h-full border-none"
                  allowFullScreen
                  allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                />

                {/* Navigation Overlays */}
                <div className="absolute inset-y-0 left-0 w-20 flex items-center justify-center group">
                  <Button 
                    variant="ghost" 
                    onClick={goToPrevSlide}
                    disabled={currentSlideIndex === 0}
                    className="size-16 rounded-full bg-black/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-black/40"
                  >
                    <ChevronLeft className="size-10" />
                  </Button>
                </div>
                <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center group">
                  <Button 
                    variant="ghost" 
                    onClick={goToNextSlide}
                    disabled={currentSlideIndex >= speakerNotes.length - 1}
                    className="size-16 rounded-full bg-black/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-black/40"
                  >
                    <ChevronRight className="size-10" />
                  </Button>
                </div>
              </div>

              {/* Navigation HUD Control Bar */}
              <div className="h-24 bg-slate-950 border-t border-white/10 flex items-center justify-center gap-8 px-12">
                <Button 
                  onClick={goToPrevSlide}
                  disabled={currentSlideIndex === 0}
                  variant="outline"
                  className="h-14 px-8 border-white/10 hover:bg-white/5 font-black uppercase tracking-widest text-xs rounded-xl"
                >
                  <ChevronLeft className="mr-2 h-5 w-5" /> PREVIOUS
                </Button>

                <div className="flex flex-col items-center gap-1 min-w-[120px]">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Current Slide</span>
                  <div className="text-3xl font-black text-white tabular-nums">
                    {currentSlideIndex + 1} <span className="text-white/20 text-xl">/ {speakerNotes.length || '?'}</span>
                  </div>
                </div>

                <Button 
                  onClick={goToNextSlide}
                  disabled={currentSlideIndex >= speakerNotes.length - 1}
                  className="h-14 px-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-xl shadow-blue-500/20"
                >
                  NEXT SLIDE <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[60] w-full max-w-lg">
                <Alert className="bg-black/80 backdrop-blur-md border-blue-500/20 text-white">
                  <Gamepad2 className="h-4 w-4 text-blue-400" />
                  <AlertTitle className="text-[10px] font-black uppercase tracking-widest text-blue-400">Sync Mode Enabled</AlertTitle>
                  <AlertDescription className="text-[9px] font-bold text-white/60">
                    Navigating using the HUD buttons below automatically keeps your teleprompter and slides in sync.
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

        <aside className="w-1/4 min-w-[350px] bg-slate-950 flex flex-col overflow-hidden relative border-l border-white/5">
          <Tabs defaultValue="notes" className="flex flex-col h-full">
            <div className="p-4 border-b border-white/5 bg-slate-900/50">
              <TabsList className="grid w-full grid-cols-2 bg-black/40 p-1">
                <TabsTrigger value="notes" className="text-[10px] font-black uppercase tracking-widest">
                  <FileText className="mr-2 h-3 w-3" /> Teleprompter
                </TabsTrigger>
                <TabsTrigger value="bible" className="text-[10px] font-black uppercase tracking-widest">
                  <BookOpen className="mr-2 h-3 w-3" /> Bible
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="notes" className="flex-grow flex flex-col m-0 overflow-hidden">
              <div className="p-6 flex items-center justify-between border-b border-white/5 bg-slate-900/20">
                <h2 className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                  <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                  Active Slide {currentSlideIndex + 1}
                </h2>
                <span className="text-[10px] font-mono font-bold text-white/40">
                  Notes Synchronized
                </span>
              </div>
              
              <ScrollArea className="flex-grow p-8">
                {loadingNotes ? (
                  <div className="flex flex-col items-center justify-center h-full py-20 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-[10px] font-black text-white/20 uppercase">Syncing Teleprompter...</p>
                  </div>
                ) : speakerNotes.length > 0 ? (
                  <div className="space-y-6">
                    <p className="text-3xl font-medium leading-[1.6] text-white/90 whitespace-pre-wrap font-body">
                      {speakerNotes[currentSlideIndex]}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-20 opacity-20 italic">
                    <FileText className="size-16 mx-auto mb-4" />
                    <p>No speaker notes found for this presentation.</p>
                  </div>
                )}
              </ScrollArea>
              
              {speakerNotes.length > 0 && (
                <div className="p-6 border-t border-white/5 bg-slate-900/20 space-y-4">
                   <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/20">
                    <span>Coming Up Next</span>
                    <span>Slide {currentSlideIndex + 2}</span>
                  </div>
                  <p className="text-xs text-white/40 italic line-clamp-2">
                    {speakerNotes[currentSlideIndex + 1] || "End of presentation."}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="bible" className="flex-grow m-0">
              <iframe 
                src="https://www.biblegateway.com"
                className="w-full h-full border-none"
                scrolling="yes"
                title="Bible Reference"
              />
            </TabsContent>
          </Tabs>
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
          StudyForge v3.5 • Speaker Teleprompter Active • Slide Sync ON
        </div>
      </footer>
    </div>
  );
}
