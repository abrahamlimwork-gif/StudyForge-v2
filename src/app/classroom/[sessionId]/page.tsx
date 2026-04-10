
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
  ChevronLeft,
  ChevronRight,
  FileText,
  Radio,
  Gamepad2,
  PanelLeftClose,
  PanelLeft,
  PanelRightClose,
  PanelRight,
  Layout
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GoogleDriveExplorer } from '@/components/google-drive-explorer';
import { generateSermonSlides } from '@/ai/flows/generate-sermon-slides';
import { createGoogleSlides, addSlidesContent, fetchSpeakerNotes } from '@/lib/google-api-utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

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

  // Sidebar visibility states
  const [isLibraryVisible, setIsLibraryVisible] = useState(true);
  const [isNotesVisible, setIsNotesVisible] = useState(true);

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
  // Removed delayms=3000 to fix the navigation delay
  // Added rm=minimal to hide Google UI and force HUD control for sync
  const slidesUrl = useMemo(() => {
    if (!selectedFileId) return null;
    return `https://docs.google.com/presentation/d/${selectedFileId}/embed?rm=minimal&slide=id.p${currentSlideIndex + 1}`;
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
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden font-body">
      
      <header className="h-24 border-b border-white/10 flex items-center justify-between px-8 bg-slate-950 z-50 shrink-0">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="hover:bg-white/10 text-white/50 h-12 px-4 font-black uppercase tracking-widest text-[10px]">
            <ArrowLeft className="mr-2 h-4 w-4" /> Exit
          </Button>
          <div className="h-8 w-px bg-white/10" />
          
          <div className="flex items-center gap-2">
             <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsLibraryVisible(!isLibraryVisible)}
              className={cn("h-12 w-12 border-white/10 rounded-xl transition-all", isLibraryVisible ? "bg-blue-600 border-blue-500 text-white" : "bg-transparent text-white/40")}
              title="Toggle Library"
            >
              {isLibraryVisible ? <PanelLeftClose className="size-5" /> : <PanelLeft className="size-5" />}
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsNotesVisible(!isNotesVisible)}
              className={cn("h-12 w-12 border-white/10 rounded-xl transition-all", isNotesVisible ? "bg-blue-600 border-blue-500 text-white" : "bg-transparent text-white/40")}
              title="Toggle Teleprompter"
            >
              {isNotesVisible ? <PanelRightClose className="size-5" /> : <PanelRight className="size-5" />}
            </Button>
          </div>

          <h1 className="text-lg font-black tracking-tighter uppercase flex items-center gap-3 ml-4">
            <Layout className="h-5 w-5 text-blue-400" />
            <span className="hidden lg:inline">Workspace HUD</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {selectedFileId && (
            <Button 
              onClick={handleLaunchAudience}
              className="bg-red-600 hover:bg-red-500 text-white font-black h-12 px-6 shadow-xl shadow-red-500/20 rounded-xl text-[10px] tracking-widest uppercase"
            >
              <Radio className="mr-2 h-4 w-4 animate-pulse" /> LIVE STREAM
            </Button>
          )}

          {isGoogleConnected && (
            <Button 
              onClick={handleAISermonGen} 
              disabled={isGenerating}
              variant="outline" 
              className="border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 h-12 px-4 font-black text-[10px] tracking-widest rounded-xl"
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              AI GEN
            </Button>
          )}

          <Button onClick={copyInviteLink} variant="outline" className="border-white/10 hover:bg-white/5 h-12 px-4 font-bold text-[10px] tracking-widest rounded-xl">
            {hasCopied ? <Check className="mr-2 h-4 w-4 text-green-400" /> : <Share2 className="mr-2 h-4 w-4" />}
            {hasCopied ? "COPIED" : "SHARE"}
          </Button>

          {user && (
            <Avatar className="size-10 border border-white/10">
              <AvatarImage src={user.photoURL || undefined} />
              <AvatarFallback className="bg-blue-600 text-white text-[10px] font-black uppercase">
                {user.displayName?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </header>

      <main className="flex-grow flex overflow-hidden">
        
        <aside className={cn(
          "bg-slate-900 flex flex-col border-r border-white/5 transition-all duration-300 ease-in-out",
          isLibraryVisible ? "w-1/4 min-w-[350px] opacity-100" : "w-0 min-w-0 opacity-0 pointer-events-none"
        )}>
          <GoogleDriveExplorer key={refreshKey} onFileSelect={setSelectedFileId} />
        </aside>

        <section className="flex-grow bg-black flex flex-col relative overflow-hidden transition-all duration-300">
          {slidesUrl ? (
            <>
              <div className="absolute top-6 right-6 z-[60] flex gap-3">
                <Button 
                  onClick={() => window.open(`https://docs.google.com/presentation/d/${selectedFileId}/present#slide=id.p${currentSlideIndex + 1}`, '_blank')}
                  variant="secondary"
                  className="bg-blue-600/90 hover:bg-blue-600 text-white font-black border-none h-10 px-4 rounded-xl shadow-2xl text-[10px] tracking-widest"
                >
                  <Maximize2 className="mr-2 h-4 w-4" /> POP OUT
                </Button>
              </div>
              
              <div className="flex-grow relative bg-slate-950 flex items-center justify-center">
                <iframe 
                  src={slidesUrl}
                  className="w-full h-full border-none shadow-2xl"
                  allowFullScreen
                />

                {/* Navigation Overlays */}
                <div className="absolute inset-y-0 left-0 w-24 flex items-center justify-center group z-40">
                  <Button 
                    variant="ghost" 
                    onClick={goToPrevSlide}
                    disabled={currentSlideIndex === 0}
                    className="size-16 rounded-full bg-black/40 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-black/60 border border-white/10"
                  >
                    <ChevronLeft className="size-10" />
                  </Button>
                </div>
                <div className="absolute inset-y-0 right-0 w-24 flex items-center justify-center group z-40">
                  <Button 
                    variant="ghost" 
                    onClick={goToNextSlide}
                    disabled={currentSlideIndex >= speakerNotes.length - 1}
                    className="size-16 rounded-full bg-black/40 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-black/60 border border-white/10"
                  >
                    <ChevronRight className="size-10" />
                  </Button>
                </div>
              </div>

              {/* Navigation Control Bar */}
              <div className="h-24 bg-slate-950 border-t border-white/10 flex items-center justify-center gap-12 px-12 z-50">
                <Button 
                  onClick={goToPrevSlide}
                  disabled={currentSlideIndex === 0}
                  variant="outline"
                  className="h-14 px-8 border-white/10 hover:bg-white/5 font-black uppercase tracking-widest text-[10px] rounded-xl"
                >
                  <ChevronLeft className="mr-2 h-5 w-5" /> PREVIOUS
                </Button>

                <div className="flex flex-col items-center gap-1 min-w-[140px]">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Slide Progress</span>
                  <div className="text-3xl font-black text-white tabular-nums">
                    {currentSlideIndex + 1} <span className="text-white/20 text-xl font-medium">/ {speakerNotes.length || '?'}</span>
                  </div>
                </div>

                <Button 
                  onClick={goToNextSlide}
                  disabled={currentSlideIndex >= (speakerNotes.length || 1) - 1}
                  className="h-14 px-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-xl shadow-blue-500/20"
                >
                  NEXT SLIDE <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm">
                <Alert className="bg-black/80 backdrop-blur-xl border-blue-500/20 text-white rounded-2xl shadow-2xl">
                  <Gamepad2 className="h-4 w-4 text-blue-400" />
                  <AlertTitle className="text-[10px] font-black uppercase tracking-widest text-blue-400">HUD Sync Enabled</AlertTitle>
                  <AlertDescription className="text-[9px] font-bold text-white/60">
                    Use HUD buttons for instant slide & note synchronization.
                  </AlertDescription>
                </Alert>
              </div>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-12 space-y-8">
              <div className="p-12 bg-slate-900 rounded-[3rem] border border-white/5 shadow-inner">
                <Monitor className="size-20 text-white/5" />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-white/20 uppercase tracking-[0.3em]">
                  Select Content
                </h3>
                <p className="text-sm text-white/10 max-w-xs italic font-medium">
                  {isGoogleConnected 
                    ? "Choose a sermon from your library or use AI to generate a fresh outline."
                    : "Connect your Workspace in the sidebar to synchronize your sermon archive."}
                </p>
              </div>
            </div>
          )}
        </section>

        <aside className={cn(
          "bg-slate-950 flex flex-col relative border-l border-white/5 transition-all duration-300 ease-in-out",
          isNotesVisible ? "w-1/4 min-w-[350px] opacity-100" : "w-0 min-w-0 opacity-0 pointer-events-none"
        )}>
          <Tabs defaultValue="notes" className="flex flex-col h-full">
            <div className="p-4 border-b border-white/5 bg-slate-900/50">
              <TabsList className="grid w-full grid-cols-2 bg-black/40 p-1 rounded-xl">
                <TabsTrigger value="notes" className="text-[10px] font-black uppercase tracking-widest rounded-lg">
                  <FileText className="mr-2 h-3 w-3" /> Notes
                </TabsTrigger>
                <TabsTrigger value="bible" className="text-[10px] font-black uppercase tracking-widest rounded-lg">
                  <BookOpen className="mr-2 h-3 w-3" /> Bible
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="notes" className="flex-grow flex flex-col m-0 overflow-hidden">
              <div className="p-6 flex items-center justify-between border-b border-white/5 bg-slate-900/10">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                  <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                  Teleprompter
                </h2>
                <span className="text-[9px] font-mono font-bold text-white/20 uppercase">
                  Slide {currentSlideIndex + 1}
                </span>
              </div>
              
              <ScrollArea className="flex-grow p-8">
                {loadingNotes ? (
                  <div className="flex flex-col items-center justify-center h-full py-20 space-y-4 opacity-50">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Synchronizing Notes...</p>
                  </div>
                ) : speakerNotes.length > 0 ? (
                  <div className="space-y-6">
                    <p className="text-2xl font-medium leading-relaxed text-white/90 whitespace-pre-wrap font-body selection:bg-blue-600">
                      {speakerNotes[currentSlideIndex]}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-24 opacity-10 italic space-y-4">
                    <FileText className="size-16 mx-auto" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No notes found.</p>
                  </div>
                )}
              </ScrollArea>
              
              {speakerNotes.length > 0 && (
                <div className="p-6 border-t border-white/5 bg-slate-900/20 space-y-3">
                   <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/20">
                    <span>UP NEXT</span>
                    <span>SLIDE {currentSlideIndex + 2}</span>
                  </div>
                  <p className="text-[11px] text-white/30 italic line-clamp-2">
                    {speakerNotes[currentSlideIndex + 1] || "Conclusion of presentation."}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="bible" className="flex-grow m-0">
              <iframe 
                src="https://www.biblegateway.com"
                className="w-full h-full border-none opacity-80 hover:opacity-100 transition-opacity"
                scrolling="yes"
                title="Bible Reference"
              />
            </TabsContent>
          </Tabs>
        </aside>

      </main>

      <footer className="h-12 bg-black border-t border-white/5 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-6 text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">
          <span className="flex items-center gap-2">
            <div className={`h-1.5 w-1.5 ${isGoogleConnected ? 'bg-green-500' : 'bg-red-500'} rounded-full`} />
            {isGoogleConnected ? "Workspace Synchronized" : "Cloud Disconnected"}
          </span>
          <span className="opacity-20">|</span>
          <span className="flex items-center gap-2">
            <Clock className="h-3 w-3" /> {currentTime || '--:--:--'}
          </span>
        </div>
        <div className="text-[9px] font-black text-white/10 uppercase italic tracking-[0.4em]">
          StudyForge v3.5 • Speaker Engine 2.0 • Slide Sync Active
        </div>
      </footer>
    </div>
  );
}
