
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Check, 
  Share2, 
  ExternalLink, 
  Plus, 
  Minus, 
  Search, 
  Maximize2, 
  Minimize2,
  Highlighter,
  Save,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFirestore, useDoc, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

export default function PreacherCommandCenter() {
  const { sessionId } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();

  // --- Layout State ---
  const [fontSize, setFontSize] = useState(24);
  const [isMeetingMode, setIsMeetingMode] = useState(false);
  const [isBibleVisible, setIsBibleVisible] = useState(true);
  
  // --- Functional State ---
  const [hasCopied, setHasCopied] = useState(false);
  const [finishedParagraphs, setFinishedParagraphs] = useState<number[]>([]);
  const [localNotes, setLocalNotes] = useState('');
  const [currentTime, setCurrentTime] = useState<string | null>(null);

  // --- Bible Sidebar State ---
  const [bibleQuery, setBibleQuery] = useState('Juan 3:16');
  const [bibleVersion, setBibleVersion] = useState('MBBTAG');
  const [isBibleLoading, setIsBibleLoading] = useState(false);
  const [iframeUrl, setIframeUrl] = useState(`https://www.biblegateway.com/passage/?search=Juan 3:16&version=MBBTAG&interface=print`);

  // --- Hydration Fix ---
  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Firestore Integration ---
  const sessionDocRef = useMemoFirebase(() => {
    if (!db || !sessionId) return null;
    return doc(db, 'public_sessions', sessionId as string);
  }, [db, sessionId]);

  const { data: sessionData } = useDoc(sessionDocRef);

  useEffect(() => {
    if (sessionData?.notes && !localNotes) {
      setLocalNotes(sessionData.notes);
    }
  }, [sessionData]);

  useEffect(() => {
    if (!sessionDocRef || localNotes === (sessionData?.notes || '')) return;
    const timeout = setTimeout(() => {
      updateDocumentNonBlocking(sessionDocRef, { 
        notes: localNotes,
        updatedAt: new Date().toISOString() 
      });
    }, 1000);
    return () => clearTimeout(timeout);
  }, [localNotes, sessionDocRef, sessionData?.notes]);

  // --- Actions ---
  const roomName = typeof sessionId === 'string' ? sessionId : 'TestSession';
  const jitsiUrl = `https://meet.jit.si/${roomName}`;

  const copyInviteLink = () => {
    navigator.clipboard.writeText(jitsiUrl);
    setHasCopied(true);
    toast({ title: "Link Copied!", description: "Share this link with your congregation." });
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleBibleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!bibleQuery.trim()) return;
    setIsBibleLoading(true);
    setIframeUrl(`https://www.biblegateway.com/passage/?search=${encodeURIComponent(bibleQuery)}&version=${bibleVersion}&interface=print`);
  };

  const toggleParagraph = (index: number) => {
    setFinishedParagraphs(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const manuscriptParagraphs = [
    "Opening Prayer: Gracious Lord, we thank You for this gathering. Open our hearts to Your Word today.",
    "The core of our message today is 'Unyielding Faith'. In a world of shifting sands, we find our rock in Christ.",
    "Reflect on Hebrews 11:1. Faith is not just a feeling, but the substance of what we hope for.",
    "Key Point: Persistence is developed in the trials, not the triumphs. James 1:12 reminds us of the crown of life.",
    "Conclusion: As you leave this virtual sanctuary, carry this persistence with you. Amen."
  ];

  return (
    <div className={cn("h-screen flex flex-col bg-background transition-all", isMeetingMode ? "overflow-hidden" : "")}>
      {!isMeetingMode && <Navbar />}
      
      {/* Persistent Toolbar */}
      <div className="bg-white border-b px-8 py-3 flex items-center justify-between shadow-sm z-50 shrink-0">
        <div className="flex items-center gap-4">
          {!isMeetingMode && (
            <Button variant="ghost" size="lg" onClick={() => router.push('/dashboard')} className="text-lg font-bold">
              <ArrowLeft className="mr-2" /> Back
            </Button>
          )}
          <h1 className="text-2xl font-black text-primary uppercase hidden md:block">
            {sessionData?.name || "Session Control"}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={copyInviteLink} variant="outline" size="lg" className="h-12 text-lg font-bold px-6">
            {hasCopied ? <Check className="mr-2" /> : <Share2 className="mr-2" />}
            {hasCopied ? "COPIED" : "COPY LINK"}
          </Button>
          <Button onClick={() => window.open(jitsiUrl, '_blank')} variant="secondary" size="lg" className="h-12 text-lg font-black px-6 shadow-md">
            <ExternalLink className="mr-2" /> LAUNCH VIDEO
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsMeetingMode(!isMeetingMode)}
            className="h-12 w-12 border"
          >
            {isMeetingMode ? <Minimize2 /> : <Maximize2 />}
          </Button>
        </div>
      </div>

      <main className="flex-grow flex flex-row overflow-hidden bg-[#f8fafc]">
        
        {/* Left Column: Live Notes (25%) */}
        <aside className="w-[25%] bg-slate-50 flex flex-col border-r-2">
          <div className="p-6 bg-white border-b flex items-center justify-between">
            <h2 className="text-xl font-black uppercase text-slate-500 flex items-center gap-2">
              <Save className="size-5" /> Live Notes
            </h2>
            <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" title="Auto-saving enabled" />
          </div>
          <div className="flex-grow p-6 flex flex-col">
            <Textarea 
              placeholder="Jot down inspiration here... (Auto-saves)"
              className="flex-grow text-xl p-6 border-2 focus:ring-4 rounded-2xl shadow-inner resize-none bg-white"
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
            />
          </div>
          <div className="p-4 bg-slate-100 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
            Cloud Sync Active • {currentTime || 'Initializing...'}
          </div>
        </aside>

        {/* Middle Column: Manuscript (Flex) */}
        <section className="flex-grow bg-white shadow-lg z-10 flex flex-col border-r-2 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex justify-between items-center px-8">
            <div className="flex items-center gap-2">
              <Highlighter className="size-5 text-accent" />
              <span className="text-sm font-black text-slate-500 uppercase">Manuscript Mode</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setFontSize(f => Math.max(16, f - 2))}><Minus /></Button>
              <span className="font-mono font-bold w-12 text-center text-xl">{fontSize}px</span>
              <Button variant="outline" size="icon" onClick={() => setFontSize(f => Math.min(48, f + 2))}><Plus /></Button>
            </div>
          </div>

          <ScrollArea className="flex-grow">
            <article className="max-w-3xl mx-auto py-12 px-12 space-y-12">
              {manuscriptParagraphs.map((para, idx) => (
                <div 
                  key={idx}
                  onClick={() => toggleParagraph(idx)}
                  className={cn(
                    "cursor-pointer transition-all p-6 rounded-2xl border-2 border-transparent hover:border-slate-100",
                    finishedParagraphs.includes(idx) ? "opacity-30 bg-slate-50" : "opacity-100"
                  )}
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}
                >
                  <p className={cn(
                    "font-medium text-slate-900",
                    finishedParagraphs.includes(idx) ? "line-through" : ""
                  )}>
                    {para}
                  </p>
                </div>
              ))}
              <div className="h-32" />
            </article>
          </ScrollArea>
        </section>

        {/* Right Column: Bible Sidebar (380px, Collapsible) */}
        <aside 
          className={cn(
            "bg-white flex flex-col border-l-2 transition-all duration-300 relative",
            isBibleVisible ? "w-[380px]" : "w-0 overflow-hidden"
          )}
        >
          {/* Collapse Toggle */}
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setIsBibleVisible(!isBibleVisible)}
            className="absolute -left-5 top-1/2 -translate-y-1/2 z-50 rounded-full shadow-lg h-10 w-10 border-2"
          >
            {isBibleVisible ? <ChevronRight /> : <ChevronLeft />}
          </Button>

          {isBibleVisible && (
            <>
              <div className="p-6 bg-slate-50 border-b space-y-4">
                <h2 className="text-xl font-black uppercase text-primary flex items-center gap-2">
                  <BookOpen className="size-6" /> Bible Reference
                </h2>
                
                <form onSubmit={handleBibleSearch} className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-black text-slate-400 uppercase">Version</span>
                    <Select value={bibleVersion} onValueChange={setBibleVersion}>
                      <SelectTrigger className="w-full h-11 text-lg font-bold border-2">
                        <SelectValue placeholder="Select Version" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MBBTAG">Tagalog: MBBTAG</SelectItem>
                        <SelectItem value="TAG">Tagalog: Ang Biblia</SelectItem>
                        <SelectItem value="NIV">English: NIV</SelectItem>
                        <SelectItem value="ESV">English: ESV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-black text-slate-400 uppercase">Scripture</span>
                    <div className="relative">
                      <Input 
                        placeholder="Juan 3:16" 
                        className="h-12 text-lg pl-10 border-2 font-bold"
                        value={bibleQuery}
                        onChange={(e) => setBibleQuery(e.target.value)}
                      />
                      <Search className="absolute left-3 top-3.5 text-slate-400 size-5" />
                      <Button 
                        type="submit"
                        size="sm" 
                        className="absolute right-1.5 top-1.5 h-9 bg-primary text-white"
                      >
                        GO
                      </Button>
                    </div>
                  </div>
                </form>
              </div>

              <div className="flex-grow relative bg-[#f1f5f9]">
                {isBibleLoading && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 animate-in fade-in">
                    <Loader2 className="size-10 text-primary animate-spin mb-2" />
                    <p className="text-sm font-black text-slate-500 uppercase">Loading Scripture...</p>
                  </div>
                )}
                <iframe 
                  src={iframeUrl}
                  className="w-full h-full border-none"
                  onLoad={() => setIsBibleLoading(false)}
                />
              </div>
            </>
          )}
        </aside>
      </main>
    </div>
  );
}
