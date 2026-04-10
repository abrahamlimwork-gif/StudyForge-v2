"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Check, 
  Share2, 
  ExternalLink, 
  FileText, 
  Upload, 
  Monitor, 
  Settings,
  BookOpen,
  Layout,
  Clock,
  MoreVertical,
  ChevronLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function PresenterDashboard() {
  const { sessionId } = useParams();
  const router = useRouter();
  const { toast } = useToast();

  // --- Layout & Functional State ---
  const [hasCopied, setHasCopied] = useState(false);
  const [slidesUrl, setSlidesUrl] = useState('https://docs.google.com/presentation/d/1_S0Z0YxXW-Z8E2E-eE0E0E0E0E0E0E0E0E0E/present');
  const [currentTime, setCurrentTime] = useState<string | null>(null);

  // --- Hydration Fix for Clock ---
  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Actions ---
  const roomName = typeof sessionId === 'string' ? sessionId : 'TestSession';
  const jitsiUrl = `https://meet.jit.si/${roomName}`;

  const copyInviteLink = () => {
    navigator.clipboard.writeText(jitsiUrl);
    setHasCopied(true);
    toast({ title: "Invite Link Copied!", description: "Share this URL with your participants." });
    setTimeout(() => setHasCopied(false), 2000);
  };

  // Mock File Data
  const libraryFiles = [
    { id: '1', name: 'Sermon_Notes_Week4.pdf', size: '1.2MB', date: '2023-10-24' },
    { id: '2', name: 'Intro_Video.mp4', size: '45MB', date: '2023-10-23' },
    { id: '3', name: 'Presentation_Slides.pptx', size: '5.4MB', date: '2023-10-22' },
    { id: '4', name: 'Scripture_Ref_Sheet.docx', size: '450KB', date: '2023-10-20' },
  ];

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      
      {/* Persistent Dark Toolbar */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-slate-950/50 backdrop-blur-md z-50 shrink-0">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="hover:bg-white/10 text-white/70">
            <ArrowLeft className="mr-2 h-4 w-4" /> Exit
          </Button>
          <div className="h-4 w-px bg-white/10" />
          <h1 className="text-lg font-black tracking-tighter uppercase flex items-center gap-2">
            <Monitor className="h-5 w-5 text-blue-400" />
            <span>Presenter HUD</span>
            <span className="text-xs font-mono bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded ml-2">LIVE</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-sm font-mono text-white/40 mr-4">
            <Clock className="h-4 w-4" /> {currentTime || '--:--:--'}
          </div>
          
          <Button onClick={copyInviteLink} variant="outline" className="border-white/20 hover:bg-white/10 h-10 px-4">
            {hasCopied ? <Check className="mr-2 h-4 w-4" /> : <Share2 className="mr-2 h-4 w-4" />}
            {hasCopied ? "COPIED" : "INVITE LINK"}
          </Button>

          <Button 
            onClick={() => window.open(jitsiUrl, '_blank')} 
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 px-6 shadow-lg shadow-blue-500/20"
          >
            <ExternalLink className="mr-2 h-4 w-4" /> LAUNCH JITSI
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-white/50 hover:text-white">
                <Settings className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>HUD Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-white/40">Google Slides Embed URL</label>
                  <Input 
                    value={slidesUrl} 
                    onChange={(e) => setSlidesUrl(e.target.value)} 
                    className="bg-black/40 border-white/10 h-12"
                    placeholder="https://docs.google.com/presentation/d/.../embed"
                  />
                  <p className="text-[10px] text-white/30 italic">Note: Use '/present' or '/embed' URL for the best HUD experience.</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main 3-Column Layout */}
      <main className="flex-grow flex overflow-hidden">
        
        {/* Left Column: File Library (25%) */}
        <aside className="w-1/4 min-w-[300px] border-r border-white/5 bg-slate-950/20 flex flex-col overflow-hidden">
          <div className="p-5 flex items-center justify-between border-b border-white/5 bg-white/5">
            <h2 className="text-xs font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Media Library
            </h2>
            <Button size="sm" variant="secondary" className="h-8 text-xs font-bold px-3">
              <Upload className="h-3 w-3 mr-1" /> UPLOAD
            </Button>
          </div>
          
          <ScrollArea className="flex-grow">
            <div className="p-4 space-y-3">
              {libraryFiles.map((file) => (
                <div 
                  key={file.id} 
                  className="group p-4 bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 rounded-xl transition-all cursor-pointer flex items-center gap-4"
                >
                  <div className="h-10 w-10 bg-slate-800 rounded-lg flex items-center justify-center text-blue-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-bold truncate text-white/90">{file.name}</p>
                    <p className="text-[10px] font-mono text-white/30 uppercase mt-0.5">{file.size} • {file.date}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8 text-white/40">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <div className="mt-8 p-6 border-2 border-dashed border-white/5 rounded-2xl text-center">
                <p className="text-xs text-white/20 font-medium">Drop files here to add to session storage</p>
              </div>
            </div>
          </ScrollArea>
        </aside>

        {/* Middle Column: Presenter HUD (50%) */}
        <section className="flex-grow border-r border-white/5 bg-black flex flex-col relative overflow-hidden">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/60">
            <Layout className="h-3 w-3 text-blue-500" />
            Active Slide Deck
          </div>
          
          <div className="flex-grow w-full bg-slate-900/50 flex items-center justify-center">
            {/* 
              Optimized for Google Slides Presenter View. 
              The iframe fills the center area perfectly. 
            */}
            <iframe 
              src={slidesUrl}
              className="w-full h-full border-none shadow-2xl"
              allowFullScreen
            />
          </div>
        </section>

        {/* Right Column: Bible Sidebar (25%) */}
        <aside className="w-1/4 min-w-[320px] bg-slate-950 flex flex-col overflow-hidden relative">
          <div className="p-5 border-b border-white/5 bg-slate-900/50 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Scripture Engine
            </h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => window.open('https://www.biblegateway.com', '_blank')}
              className="h-8 w-8 text-white/30 hover:text-white"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
          
          {/* 
            Full, unedited BibleGateway integration as requested. 
            We let the website handle the searching and versioning natively.
          */}
          <div className="flex-grow w-full bg-white h-full">
            <iframe 
              src="https://www.biblegateway.com"
              className="w-full h-full border-none"
              scrolling="yes"
              title="BibleGateway Native UI"
            />
          </div>
          
          <div className="p-4 bg-slate-900 border-t border-white/5 text-[10px] text-center font-bold text-white/20 uppercase tracking-[0.2em]">
            Native Bible Engine Powered by BibleGateway
          </div>
        </aside>

      </main>

      {/* Footer / Status Bar */}
      <footer className="h-10 bg-black border-t border-white/5 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4 text-[10px] font-mono text-white/20 uppercase tracking-widest">
          <span className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
            Cloud Storage Connected
          </span>
          <span className="opacity-50">|</span>
          <span>Presenter Role: {sessionId}</span>
        </div>
        <div className="text-[10px] font-bold text-white/10 uppercase italic">
          StudyForge Presenter Suite v2.0
        </div>
      </footer>
    </div>
  );
}
