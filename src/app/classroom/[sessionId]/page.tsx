"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
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
  Layout,
  HardDrive,
  CloudUpload,
  AlertTriangle
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
  const [localFileUrl, setLocalFileUrl] = useState<string | null>(null);
  const [localFileType, setLocalFileType] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [speakerNotes, setSpeakerNotes] = useState<string[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [isAudienceLive, setIsAudienceLive] = useState(false);

  const audienceWindowRef = useRef<Window | null>(null);
  const [isLibraryVisible, setIsLibraryVisible] = useState(true);
  const [isNotesVisible, setIsNotesVisible] = useState(true);

  const isLocalFile = selectedFileId?.startsWith('local-');

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkStatus = () => {
      const token = localStorage.getItem('studyforge_dev_token') || localStorage.getItem('google_access_token');
      setIsGoogleConnected(!!token);
    };
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // Handle local file selection and URL cleanup
  const handleFileSelect = (id: string, file?: File) => {
    if (localFileUrl) {
      URL.revokeObjectURL(localFileUrl);
    }

    setSelectedFileId(id);
    if (file) {
      const url = URL.createObjectURL(file);
      setLocalFileUrl(url);
      setLocalFileType(file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'pptx');
      setSpeakerNotes(["Local HUD Active", `Rendering file: ${file.name}`]);
    } else {
      setLocalFileUrl(null);
      setLocalFileType(null);
    }
  };

  useEffect(() => {
    return () => {
      if (localFileUrl) URL.revokeObjectURL(localFileUrl);
    };
  }, [localFileUrl]);

  useEffect(() => {
    if (selectedFileId && !isLocalFile) {
      const token = localStorage.getItem('studyforge_dev_token') || localStorage.getItem('google_access_token');
      if (token) {
        setLoadingNotes(true);
        fetchSpeakerNotes(token, selectedFileId)
          .then(notes => {
            setSpeakerNotes(notes);
            setCurrentSlideIndex(0);
          })
          .catch(err => {
            console.error("Notes Error:", err);
            setSpeakerNotes(["(Note extraction failed or not available for this file)"]);
          })
          .finally(() => setLoadingNotes(false));
      }
    } else if (!isLocalFile) {
      setSpeakerNotes([]);
      setCurrentSlideIndex(0);
    }
  }, [selectedFileId, isLocalFile]);

  const slidesUrl = useMemo(() => {
    if (!selectedFileId || isLocalFile) return null;
    return `https://docs.google.com/presentation/d/${selectedFileId}/embed?rm=minimal&slide=id.p${currentSlideIndex + 1}`;
  }, [selectedFileId, currentSlideIndex, isLocalFile]);

  const audienceUrl = useMemo(() => {
    if (!selectedFileId || isLocalFile) return null;
    return `https://docs.google.com/presentation/d/${selectedFileId}/present?rm=minimal&slide=id.p${currentSlideIndex + 1}`;
  }, [selectedFileId, currentSlideIndex, isLocalFile]);

  useEffect(() => {
    if (isAudienceLive && audienceUrl) {
      audienceWindowRef.current = window.open(audienceUrl, 'StudyForgeAudience');
    }
  }, [currentSlideIndex, isAudienceLive, audienceUrl]);

  const roomName = typeof sessionId === 'string' ? sessionId : 'TestSession';
  const jitsiUrl = `https://meet.jit.si/${roomName}`;

  const copyInviteLink = () => {
    navigator.clipboard.writeText(jitsiUrl);
    setHasCopied(true);
    toast({ title: "Invite Link Copied!" });
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleLaunchAudience = () => {
    if (isLocalFile) {
      toast({ variant: 'destructive', title: 'Sync Blocked', description: 'Local files require a manual audience window in this mode.' });
      return;
    }
    if (audienceUrl) {
      audienceWindowRef.current = window.open(audienceUrl, 'StudyForgeAudience');
      setIsAudienceLive(true);
    }
  };

  const goToNextSlide = () => {
    if (currentSlideIndex < (speakerNotes.length || 1) - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const goToPrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const handleAISermonGen = async () => {
    const token = localStorage.getItem('studyforge_dev_token') || localStorage.getItem('google_access_token');
    if (!token) {
      toast({ variant: 'destructive', title: 'Connection Required', description: 'Link Google Drive or use a Dev Token first.' });
      return;
    }

    try {
      setIsGenerating(true);
      const data = await generateSermonSlides({ 
        topic: "The Path of Faith", 
        scripture: "Hebrews 11:1" 
      });
      const presentation = await createGoogleSlides(token, `AI Sermon: ${data.title}`);
      await addSlidesContent(token, presentation.presentationId, data.slides);
      setSelectedFileId(presentation.presentationId);
      setRefreshKey(prev => prev + 1);
      toast({ title: "Sermon Ready!" });
    } catch (err: any) {
      console.error("AI Slide Gen Error:", err);
      toast({ variant: 'destructive', title: 'Sync Failed' });
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
          
          <h1 className="text-lg font-black tracking-tighter uppercase flex items-center gap-3 ml-4">
            <Layout className="h-5 w-5 text-blue-400" />
            <span className="hidden lg:inline">Workspace HUD</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {selectedFileId && !isLocalFile && (
            <Button 
              onClick={handleLaunchAudience}
              className={cn(
                "font-black h-12 px-6 rounded-xl text-[10px] tracking-widest uppercase transition-all shadow-xl",
                isAudienceLive ? "bg-green-600 text-white shadow-green-500/20" : "bg-red-600 text-white shadow-red-500/20"
              )}
            >
              <Radio className={cn("mr-2 h-4 w-4", isAudienceLive && "animate-pulse")} /> 
              {isAudienceLive ? "SYNC ACTIVE" : "GO LIVE"}
            </Button>
          )}

          {isGoogleConnected && (
            <Button 
              onClick={handleAISermonGen} 
              disabled={isGenerating}
              variant="outline" 
              className="border-blue-500/30 bg-blue-500/10 text-blue-400 h-12 px-4 font-black text-[10px] tracking-widest rounded-xl"
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

      <main className="flex-grow flex overflow-hidden relative">
        <aside className={cn(
          "bg-slate-900 flex flex-col border-r border-white/5 transition-all duration-300 ease-in-out",
          isLibraryVisible ? "w-1/4 min-w-[350px]" : "w-0 min-w-0 overflow-hidden"
        )}>
          <GoogleDriveExplorer key={refreshKey} onFileSelect={handleFileSelect} />
        </aside>

        <section className="flex-grow bg-black flex flex-col relative overflow-hidden">
          <button
            onClick={() => setIsLibraryVisible(!isLibraryVisible)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-[70] h-20 w-6 flex items-center justify-center bg-slate-900/80 backdrop-blur-md border border-l-0 border-white/10 rounded-r-xl transition-all hover:bg-blue-600 text-white/40 hover:text-white"
          >
            {isLibraryVisible ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
          </button>

          <button
            onClick={() => setIsNotesVisible(!isNotesVisible)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-[70] h-20 w-6 flex items-center justify-center bg-slate-900/80 backdrop-blur-md border border-r-0 border-white/10 rounded-l-xl transition-all hover:bg-blue-600 text-white/40 hover:text-white"
          >
            {isNotesVisible ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>

          {selectedFileId ? (
            <div className="flex-grow flex flex-col">
              <div className="flex-grow relative bg-slate-950 flex items-center justify-center">
                {isLocalFile ? (
                  <div className="w-full h-full relative">
                    <iframe 
                      src={`${localFileUrl}#toolbar=0`} 
                      className="w-full h-full border-none bg-slate-900" 
                      title="Local File Viewer"
                    />
                    {localFileType === 'pptx' && (
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-md">
                        <Alert className="bg-amber-500/10 border-amber-500/50 text-amber-500 rounded-2xl shadow-2xl backdrop-blur-xl">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle className="text-[10px] font-black uppercase tracking-widest">Format Notice</AlertTitle>
                          <AlertDescription className="text-[10px] leading-relaxed">
                            Browsers cannot natively render PPTX. Please drag in a <strong>PDF</strong> for full HUD immersion.
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </div>
                ) : (
                  <iframe src={slidesUrl!} className="w-full h-full border-none" allowFullScreen />
                )}
              </div>

              {!isLocalFile && (
                <div className="h-24 bg-slate-950 border-t border-white/10 flex items-center justify-center gap-12 px-12 z-50">
                  <Button onClick={goToPrevSlide} disabled={currentSlideIndex === 0} variant="outline" className="h-14 px-8 border-white/10 font-black uppercase tracking-widest text-[10px] rounded-xl">
                    <ChevronLeft className="mr-2 h-5 w-5" /> PREVIOUS
                  </Button>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Progress</span>
                    <div className="text-3xl font-black text-white tabular-nums">
                      {currentSlideIndex + 1} <span className="text-white/20 text-xl font-medium">/ {speakerNotes.length || '?'}</span>
                    </div>
                  </div>
                  <Button onClick={goToNextSlide} disabled={currentSlideIndex >= (speakerNotes.length || 1) - 1} className="h-14 px-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-xl shadow-blue-500/20">
                    NEXT SLIDE <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-12 space-y-8">
              <div className="p-12 bg-slate-900 rounded-[3rem] border border-white/5">
                <Monitor className="size-20 text-white/5" />
              </div>
              <h3 className="text-2xl font-black text-white/20 uppercase tracking-[0.3em]">Ready for Input</h3>
            </div>
          )}
        </section>

        <aside className={cn(
          "bg-slate-950 flex flex-col relative border-l border-white/5 transition-all duration-300 ease-in-out",
          isNotesVisible ? "w-1/4 min-w-[350px]" : "w-0 min-w-0 overflow-hidden"
        )}>
          <Tabs defaultValue="notes" className="flex flex-col h-full">
            <div className="p-4 border-b border-white/5 bg-slate-900/50">
              <TabsList className="grid w-full grid-cols-2 bg-black/40 p-1 rounded-xl">
                <TabsTrigger value="notes" className="text-[10px] font-black uppercase tracking-widest rounded-lg">Notes</TabsTrigger>
                <TabsTrigger value="bible" className="text-[10px] font-black uppercase tracking-widest rounded-lg">Bible</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="notes" className="flex-grow flex flex-col m-0 overflow-hidden">
              <ScrollArea className="flex-grow p-8">
                {loadingNotes ? (
                  <div className="flex flex-col items-center justify-center h-full py-20 space-y-4 opacity-50">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Syncing...</p>
                  </div>
                ) : speakerNotes.length > 0 ? (
                  <p className="text-2xl font-medium leading-relaxed text-white/90 whitespace-pre-wrap selection:bg-blue-600">
                    {speakerNotes[currentSlideIndex]}
                  </p>
                ) : (
                  <div className="text-center py-24 opacity-10 italic">
                    <p className="text-[10px] font-black uppercase tracking-widest">No notes ready.</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            <TabsContent value="bible" className="flex-grow m-0">
              <iframe src="https://www.biblegateway.com" className="w-full h-full border-none opacity-80" />
            </TabsContent>
          </Tabs>
        </aside>
      </main>

      <footer className="h-12 bg-black border-t border-white/5 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-6 text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">
          <span className="flex items-center gap-2">
            <div className={`h-1.5 w-1.5 ${isGoogleConnected ? 'bg-green-500' : 'bg-red-500'} rounded-full`} />
            {isGoogleConnected ? "Workspace Active" : "No Cloud Sync"}
          </span>
          <span className="flex items-center gap-2">
            <Clock className="h-3 w-3" /> {currentTime || '--:--:--'}
          </span>
        </div>
        <div className="text-[9px] font-black text-white/10 uppercase tracking-[0.4em]">StudyForge v3.5 • HYBRID ACTIVE</div>
      </footer>
    </div>
  );
}
