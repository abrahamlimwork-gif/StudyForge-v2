"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
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
  AlertTriangle,
  Minus,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GoogleDriveExplorer } from '@/components/google-drive-explorer';
import { BibleViewer } from "@/components/bible-viewer";
import { MapSystem } from "@/components/map/map-system";
import { generateSermonSlides } from '@/ai/flows/generate-sermon-slides';
import { createGoogleSlides, addSlidesContent } from '@/lib/google-api-utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function PresenterDashboard() {
  const { sessionId } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const roomName = typeof sessionId === 'string' ? sessionId : 'TestSession';

  const [hasCopied, setHasCopied] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [localFileUrl, setLocalFileUrl] = useState<string | null>(null);
  const [localFileType, setLocalFileType] = useState<string | null>(null);
  const [localRawFile, setLocalRawFile] = useState<File | null>(null);
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isAudienceLive, setIsAudienceLive] = useState(false);
  const [speakerNotes, setSpeakerNotes] = useState<string[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [totalSlides, setTotalSlides] = useState(1);

  const audienceWindowRef = useRef<Window | null>(null);
  const jitsiWindowRef = useRef<Window | null>(null);
  const [isAudienceTabOpen, setIsAudienceTabOpen] = useState(false);
  const [isLibraryVisible, setIsLibraryVisible] = useState(true);
  const [isNotesVisible, setIsNotesVisible] = useState(true);
  const [libraryWidth, setLibraryWidth] = useState(320);
  const [notesWidth, setNotesWidth] = useState(380);
  const [isResizingLibrary, setIsResizingLibrary] = useState(false);
  const [isResizingNotes, setIsResizingNotes] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  const [isBibleFocused, setIsBibleFocused] = useState(false);

  const isLocalFile = selectedFileId?.startsWith('local-');

  useEffect(() => {
    if (!selectedFileId || isLocalFile) {
      setSpeakerNotes([]);
      return;
    }

    setLoadingNotes(true);
    const { firestore } = initializeFirebase();
    getDoc(doc(firestore, 'presentations', selectedFileId))
      .then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Metadata Priority: Use slideCount from Firestore if available
          if (data.slideCount) {
            setTotalSlides(data.slideCount);
          } else if (data.notes && Array.isArray(data.notes)) {
            setTotalSlides(data.notes.length);
          }

          if (data.notes && Array.isArray(data.notes)) {
            setSpeakerNotes(data.notes.filter((n: string) => typeof n === 'string'));
          } else {
             setSpeakerNotes(['(No speaker notes were found for this file.)']);
          }
        } else {
            setSpeakerNotes(['(Speaker notes syncing in background... please wait or re-select file.)']);
            setTotalSlides(1); // Reset until synced
        }
      })
      .catch(err => {
        console.error('[Notes] Firestore fetch error:', err);
        setSpeakerNotes(['(Speaker notes could not be loaded.)']);
      })
      .finally(() => setLoadingNotes(false));
  }, [selectedFileId, isLocalFile]);

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' | ' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }));
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' | ' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync state to Firestore for Audience Tab
  useEffect(() => {
    if (!isAudienceLive || !selectedFileId) return;

    const { firestore } = initializeFirebase();
    const sessionDoc = doc(firestore, 'sessions', roomName);
    
    setDoc(sessionDoc, {
      selectedFileId,
      currentSlideIndex,
      totalSlides,
      lastUpdated: new Date().getTime()
    }, { merge: true }).catch((err: any) => console.error('[Sync] Push error:', err));

  }, [currentSlideIndex, selectedFileId, isAudienceLive, roomName, totalSlides]);

  // Audience Tab Detection
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAudienceTabOpen(!!audienceWindowRef.current && !audienceWindowRef.current.closed);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const maxWidth = window.innerWidth * 0.60;
      const minWidth = 250;

      if (isResizingLibrary) {
        const newWidth = Math.max(minWidth, Math.min(maxWidth, e.clientX));
        setLibraryWidth(newWidth);
      }
      if (isResizingNotes) {
        const newWidth = Math.max(minWidth, Math.min(maxWidth, window.innerWidth - e.clientX));
        setNotesWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLibrary(false);
      setIsResizingNotes(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    if (isResizingLibrary || isResizingNotes) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizingLibrary, isResizingNotes]);

  // Jitsi Window Heartbeat
  useEffect(() => {
    if (!isAudienceLive) return;

    const interval = setInterval(() => {
      if (jitsiWindowRef.current && jitsiWindowRef.current.closed) {
        setIsAudienceLive(false);
        clearInterval(interval);
        toast({ title: "Session Ended", description: "Jitsi tab was closed. Broadcasting stopped." });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isAudienceLive, toast]);

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
    setCurrentSlideIndex(0);

    if (file) {
      const url = URL.createObjectURL(file);
      setLocalFileUrl(url);
      setLocalFileRawFile(file);
      setLocalFileType(file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'pptx');
    } else {
      setLocalFileUrl(null);
      setLocalRawFile(null);
      setLocalFileType(null);
    }
  };

  // Helper alias so both setter names work
  const setLocalFileRawFile = setLocalRawFile;

  useEffect(() => {
    return () => {
      if (localFileUrl) URL.revokeObjectURL(localFileUrl);
    };
  }, [localFileUrl]);

  // Removed Firestore/JSZip notes extraction logic based on the Dual-Iframe strategy.

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

  const jitsiUrl = `https://meet.jit.si/${roomName}`;

  const copyInviteLink = () => {
    navigator.clipboard.writeText(jitsiUrl);
    setHasCopied(true);
    toast({ title: "Meeting Link Copied!", description: "Share this link with your audience." });
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleLaunchAudience = () => {
    if (isLocalFile) {
      toast({ variant: 'destructive', title: 'Sync Blocked', description: 'Local files require a manual audience window.' });
      return;
    }
    const url = `/present/${roomName}`;
    audienceWindowRef.current = window.open(url, 'StudyForgeAudience');
    setIsAudienceTabOpen(true);
  };

  const handleGoLive = () => {
    jitsiWindowRef.current = window.open(jitsiUrl, '_blank');
    setIsAudienceLive(true);
    toast({ title: "Audience Sync Active", description: "Jitsi room opened and stage broadcasting enabled." });
  };

  const goToNextSlide = () => {
    if (currentSlideIndex < totalSlides - 1) {
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
      
      <header className="h-[56px] border-b border-white/10 flex items-center justify-between px-6 bg-slate-950/80 backdrop-blur-md z-50 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="hover:bg-white/10 text-white/50 h-9 px-3 font-black uppercase tracking-widest text-[9px]">
            <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Exit
          </Button>
          <div className="h-6 w-px bg-white/10" />
          
          <h1 className="text-sm font-black tracking-tighter uppercase flex items-center gap-2 ml-2">
            <Radio className={cn("h-4 w-4", isAudienceLive ? "text-red-500 animate-pulse" : "text-white/20")} />
            <span className="hidden lg:inline text-white/90">Mission Control</span>
          </h1>
        </div>

        <div className="flex-grow flex justify-center">
          <div className="px-6 py-1.5 bg-black/40 rounded-full border border-white/5 backdrop-blur-sm">
            <span className="text-[11px] font-mono font-black text-white/80 tracking-[0.2em] tabular-nums">
              {currentTime || '--:--:--'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={handleLaunchAudience}
            variant="outline"
            className={cn(
              "font-black h-9 px-4 rounded-xl text-[9px] tracking-widest uppercase transition-all border-white/10",
              isAudienceTabOpen ? "bg-green-600/10 text-green-400 border-green-500/50" : "text-white/40"
            )}
          >
            <Maximize2 className="mr-2 h-3.5 w-3.5" /> 
            {isAudienceTabOpen ? "Tab Active" : "Launch Stage"}
          </Button>

          <Button onClick={copyInviteLink} variant="outline" className="border-white/10 hover:bg-white/5 h-9 px-4 font-bold text-[9px] tracking-widest rounded-xl text-white/60">
            {hasCopied ? <Check className="mr-2 h-3.5 w-3.5 text-green-400" /> : <Share2 className="mr-2 h-3.5 w-3.5" />}
            {hasCopied ? "COPIED" : "SHARE HUB"}
          </Button>

          <Button 
            onClick={handleGoLive}
            className={cn(
              "font-black h-9 px-4 rounded-xl text-[9px] tracking-widest uppercase transition-all shadow-lg",
              isAudienceLive ? "bg-red-600 text-white shadow-red-500/20" : "bg-slate-800 text-white/40"
            )}
          >
            <Radio className={cn("mr-2 h-3.5 w-3.5", isAudienceLive && "animate-pulse")} /> 
            {isAudienceLive ? "LIVE" : "GO LIVE"}
          </Button>

          {user && (
            <Avatar className="size-8 border border-white/10 ml-2">
              <AvatarImage src={user.photoURL || undefined} />
              <AvatarFallback className="bg-blue-600 text-white text-[9px] font-black uppercase">
                {user.displayName?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </header>

      <main className="flex-grow flex overflow-hidden relative">
        {/* Global Interaction Shield (Prevents mouse-capture by iframes during drag) */}
        {(isResizingLibrary || isResizingNotes) && (
          <div className="fixed inset-0 z-[9999] bg-transparent cursor-col-resize" />
        )}

        <aside 
          className={cn(
            "bg-slate-900 flex flex-col border-r border-white/5 transition-width duration-300 ease-in-out relative shrink-0",
            !isLibraryVisible && "w-0 overflow-hidden border-none"
          )}
          style={{ width: isLibraryVisible ? libraryWidth : 0 }}
        >
          <GoogleDriveExplorer key={refreshKey} onFileSelect={handleFileSelect} />
          {isLibraryVisible && (
            <div 
              onMouseDown={() => setIsResizingLibrary(true)}
              className={cn(
                "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-50 transition-colors",
                isResizingLibrary ? "bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]" : "hover:bg-white/10"
              )}
            />
          )}
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
                <div className="h-16 bg-slate-950/90 border-t border-white/5 flex items-center justify-center gap-10 px-10 z-50 backdrop-blur-md">
                  <Button onClick={goToPrevSlide} disabled={currentSlideIndex === 0} variant="ghost" className="h-10 px-6 text-white/60 hover:text-white hover:bg-white/5 font-black uppercase tracking-widest text-[9px] rounded-xl border border-white/5">
                    <ChevronLeft className="mr-2 h-4 w-4" /> PREVIOUS
                  </Button>
                  
                  <div className="flex items-center gap-4 px-6 py-1.5 bg-black/40 rounded-full border border-white/5">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500">Slide</span>
                    <div className="text-sm font-black text-white tabular-nums border-l border-white/10 pl-4 ml-2">
                      {currentSlideIndex + 1} <span className="text-white/20 font-medium">/ {totalSlides}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={goToNextSlide} 
                    disabled={currentSlideIndex >= totalSlides - 1} 
                    className="h-10 px-8 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[9px] rounded-xl shadow-lg shadow-blue-500/20"
                  >
                    NEXT <ChevronRight className="ml-2 h-4 w-4" />
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

        <aside 
          className={cn(
            "bg-slate-950 flex flex-col relative border-l border-white/5 transition-width duration-300 ease-in-out shrink-0",
            !isNotesVisible && "w-0 overflow-hidden border-none"
          )}
          style={{ width: isNotesVisible ? notesWidth : 0 }}
        >
          {isNotesVisible && (
            <div 
              onMouseDown={() => setIsResizingNotes(true)}
              className={cn(
                "absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-50 transition-colors",
                isResizingNotes ? "bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]" : "hover:bg-white/10 border-l border-white/5"
              )}
            />
          )}

          <Tabs defaultValue="notes" className="flex flex-col flex-grow overflow-hidden">
            <div className="shrink-0 p-2 border-b border-white/5 bg-slate-900/50">
              <TabsList className="grid w-full grid-cols-3 bg-black/40 p-1 rounded-xl font-bold">
                <TabsTrigger value="notes" className="text-[10px] font-black uppercase tracking-widest rounded-lg">Notes</TabsTrigger>
                <TabsTrigger value="bible" className="text-[10px] font-black uppercase tracking-widest rounded-lg">Bible</TabsTrigger>
                <TabsTrigger value="map" className="text-[10px] font-black uppercase tracking-widest rounded-lg">Map</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="notes" className="flex-grow flex flex-col m-0 overflow-hidden bg-slate-950">
              <div className="flex-grow relative flex flex-col overflow-hidden bg-slate-950">
                <ScrollArea className="flex-grow">
                  <div className="p-8 pb-32 space-y-8">
                    {loadingNotes ? (
                      <div className="flex flex-col items-center justify-center py-20 space-y-4 opacity-50">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Accessing Vault...</p>
                      </div>
                    ) : speakerNotes.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500 flex items-center gap-2">
                            <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse" />
                            Slide {currentSlideIndex + 1} of {totalSlides}
                          </span>
                          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
                            <button 
                              onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                              className="p-1 hover:bg-white/10 text-white/40 hover:text-white rounded transition-colors"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-[8px] font-black w-6 text-center text-white/30">{fontSize}</span>
                            <button 
                              onClick={() => setFontSize(Math.min(36, fontSize + 2))}
                              className="p-1 hover:bg-white/10 text-white/40 hover:text-white rounded transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        <div className="relative">
                          {speakerNotes[currentSlideIndex] ? (
                            <p 
                              style={{ fontSize: `${fontSize}px` }}
                              className="font-medium leading-relaxed text-white/95 whitespace-pre-wrap selection:bg-blue-600/50 selection:text-white"
                            >
                              {speakerNotes[currentSlideIndex]}
                            </p>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-16 opacity-20 space-y-2 border-2 border-dashed border-white/10 rounded-2xl">
                              <FileText className="h-8 w-8" />
                              <p className="text-[10px] font-black uppercase tracking-widest">Silence in the Vault.</p>
                            </div>
                          )}
                        </div>

                        {/* UP NEXT Section */}
                        <div className="pt-12 mt-12 border-t border-white/10 space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">Up Next</span>
                            <div className="h-px flex-grow bg-white/5" />
                          </div>
                          
                          {currentSlideIndex + 1 < totalSlides ? (
                            <div className="opacity-40 select-none pointer-events-none">
                              <p className="text-sm font-medium leading-relaxed text-white/80 line-clamp-4 italic">
                                {speakerNotes[currentSlideIndex + 1] || "(No notes for next slide)"}
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center py-6 border border-white/5 rounded-xl bg-white/[0.02]">
                              <span className="text-[10px] font-black uppercase tracking-widest text-white/10">End of Presentation</span>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex-grow flex items-center justify-center text-center py-20 opacity-20">
                        <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Vault Metadata Required.<br/>Select an Archive File.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                
                {/* Visual Fade Gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none z-10" />
              </div>
            </TabsContent>
            <TabsContent value="bible" className="flex-grow flex flex-col m-0 p-0 bg-slate-950 overflow-hidden h-full data-[state=inactive]:hidden">
              <BibleViewer 
                isFocused={isBibleFocused} 
                sidebarWidth={notesWidth}
                onToggleFocus={() => setIsBibleFocused(!isBibleFocused)} 
              />
            </TabsContent>
            <TabsContent value="map" className="flex-grow flex flex-col m-0 overflow-hidden bg-[#02040a]">
              <MapSystem />
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
