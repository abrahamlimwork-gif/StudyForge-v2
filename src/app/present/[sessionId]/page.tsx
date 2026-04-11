"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { initializeFirebase } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

export default function AudiencePage() {
  const { sessionId } = useParams();
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const roomName = typeof sessionId === 'string' ? sessionId : 'TestSession';

  useEffect(() => {
    const { firestore } = initializeFirebase();
    const sessionDoc = doc(firestore, 'sessions', roomName);

    const unsubscribe = onSnapshot(sessionDoc, (snapshot) => {
      if (snapshot.exists()) {
        setSessionData(snapshot.data());
      }
      setLoading(false);
    }, (err) => {
      console.error('[Audience] Firestore Sync Error:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [roomName]);

  const slidesUrl = useMemo(() => {
    if (!sessionData?.selectedFileId) return null;
    const { selectedFileId, currentSlideIndex } = sessionData;
    return `https://docs.google.com/presentation/d/${selectedFileId}/embed?rm=minimal&slide=id.p${(currentSlideIndex || 0) + 1}`;
  }, [sessionData]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white/50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
        <span className="text-[10px] font-black uppercase tracking-[0.4em]">Establishing Sync...</span>
      </div>
    );
  }

  if (!slidesUrl) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-center p-12">
        <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center mb-8 border border-blue-500/20">
          <div className="size-4 bg-blue-500 rounded-full animate-pulse" />
        </div>
        <h1 className="text-2xl font-black text-white/90 uppercase tracking-tighter mb-4">Stage is Ready</h1>
        <p className="text-white/40 text-sm max-w-md font-medium leading-relaxed">
          Waiting for the presenter to share content from the Mission Control HUD.
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black overflow-hidden flex items-center justify-center">
      <iframe 
        src={slidesUrl} 
        className="w-full h-full border-none pointer-events-none" 
        allowFullScreen 
        title="StudyForge Stage"
      />
    </div>
  );
}
