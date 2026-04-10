"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Copy, Check, Loader2, BookText, Share2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ClassroomPage() {
  const { sessionId } = useParams();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const roomName = typeof sessionId === 'string' ? sessionId : 'DefaultSession';
  const jitsiUrl = `https://meet.jit.si/${roomName}`;

  const copyInviteLink = () => {
    navigator.clipboard.writeText(jitsiUrl);
    setHasCopied(true);
    toast({
      title: "Link Copied!",
      description: "You can now share this link with your students.",
    });
    setTimeout(() => setHasCopied(false), 2000);
  };

  if (isUserLoading || !user) return null;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Navbar />
      
      {/* High-Visibility Header */}
      <div className="bg-white border-b px-8 py-3 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-6">
          <Button 
            variant="destructive" 
            size="lg" 
            className="text-xl h-14 px-6 font-bold shadow-sm"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="mr-2 size-5" />
            Exit Class
          </Button>
          <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 font-bold">
            <ShieldCheck className="size-5" />
            <span>Public Secure Room</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={copyInviteLink}
            disabled={!isIframeLoaded}
            variant="secondary"
            size="lg"
            className="h-14 text-xl font-black px-8 shadow-md"
          >
            {hasCopied ? <Check className="mr-2 size-6" /> : <Share2 className="mr-2 size-6" />}
            {hasCopied ? "COPIED" : "SHARE INVITE LINK"}
          </Button>
        </div>
      </div>

      {/* Main Desktop Layout: Split Pane */}
      <main className="flex-grow flex flex-row overflow-hidden">
        
        {/* Left Panel: Jitsi Video (60%) */}
        <section className="w-[60%] relative bg-black border-r-4 border-primary/10">
          {!isIframeLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-20 space-y-4">
              <Loader2 className="size-16 animate-spin text-secondary" />
              <p className="text-white text-2xl font-bold uppercase">Opening Classroom...</p>
            </div>
          )}
          <iframe
            src={`${jitsiUrl}#config.prejoinPageEnabled=false&config.disableWelcomePage=true&interfaceConfig.SHOW_JITSI_WATERMARK=false`}
            allow="camera; microphone; display-capture; fullscreen"
            className="w-full h-full border-none"
            onLoad={() => setIsIframeLoaded(true)}
          />
        </section>

        {/* Right Panel: Teacher's Command Center (40%) */}
        <section className="w-[40%] bg-white flex flex-col shadow-inner">
          <div className="p-6 bg-primary text-white shrink-0">
            <h2 className="text-3xl font-headline font-black flex items-center gap-3 uppercase">
              <BookText className="size-8" />
              Command Center
            </h2>
          </div>

          <Tabs defaultValue="manuscript" className="flex-grow flex flex-col overflow-hidden">
            <div className="px-6 py-2 bg-slate-50 border-b">
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="manuscript" className="text-lg font-bold">MANUSCRIPT</TabsTrigger>
                <TabsTrigger value="bible" className="text-lg font-bold">BIBLE NOTES</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-grow p-8">
              <TabsContent value="manuscript" className="mt-0 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-2xl font-black text-primary border-b-2 pb-2">LESSON MANUSCRIPT</h3>
                  <div className="text-xl text-slate-800 leading-relaxed space-y-6">
                    <p className="font-bold bg-yellow-50 p-4 border-l-4 border-yellow-400">
                      [START HERE] Welcome everyone and open with a prayer of gratitude.
                    </p>
                    <p>
                      Today we explore the concept of "Persistence in Faith." Our journey begins with a reflection on how we handle life's storms. 
                    </p>
                    <p className="italic text-slate-500">
                      (Pause for 10 seconds to allow participants to reflect)
                    </p>
                    <p>
                      Key Point 1: Persistence is not just about waiting; it's about active endurance. When we look at the historical context...
                    </p>
                    <div className="bg-slate-50 p-6 rounded-xl border-2 border-dashed">
                      <p className="text-lg font-bold text-slate-600 mb-2 uppercase tracking-wide">Discussion Trigger:</p>
                      <p className="text-2xl font-black text-primary italic">
                        "Can anyone share a time when waiting for an answer actually strengthened your resolve?"
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bible" className="mt-0 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-2xl font-black text-primary border-b-2 pb-2">SCRIPTURE REFRESHER</h3>
                  <div className="space-y-8">
                    <div className="bg-primary/5 p-6 rounded-xl border-l-8 border-primary">
                      <p className="text-xl font-bold text-primary mb-2">Hebrews 11:1 (NKJV)</p>
                      <p className="text-2xl italic leading-relaxed">
                        "Now faith is the substance of things hoped for, the evidence of things not seen."
                      </p>
                    </div>
                    <div className="bg-secondary/5 p-6 rounded-xl border-l-8 border-secondary">
                      <p className="text-xl font-bold text-secondary mb-2">James 1:12</p>
                      <p className="text-2xl italic leading-relaxed">
                        "Blessed is the man who endures temptation; for when he has been approved, he will receive the crown of life..."
                      </p>
                    </div>
                    <div className="pt-4 border-t">
                      <h4 className="text-lg font-bold text-slate-500 uppercase mb-3">Contextual Notes:</h4>
                      <ul className="list-disc pl-6 space-y-3 text-xl">
                        <li>The Greek word for "substance" is <em>hupostasis</em>, meaning "assurance" or "foundation."</li>
                        <li>Consider the audience: Early Christians facing severe trials.</li>
                        <li>Cross-reference with Romans 5:3-5 for the chain of character building.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </section>
      </main>
    </div>
  );
}
