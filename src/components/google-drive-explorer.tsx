
"use client";

import { useState, useEffect } from 'react';
import { fetchGoogleSlides } from '@/lib/google-api-utils';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { FileText, Loader2, RefreshCw, Presentation, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface GoogleFile {
  id: string;
  name: string;
  modifiedTime: string;
}

export function GoogleDriveExplorer({ onFileSelect }: { onFileSelect: (id: string) => void }) {
  const [files, setFiles] = useState<GoogleFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const loadFiles = async () => {
    const token = localStorage.getItem('google_access_token');
    if (!token) {
      setHasToken(false);
      setLoading(false);
      return;
    }

    setHasToken(true);
    try {
      setLoading(true);
      const googleFiles = await fetchGoogleSlides(token);
      setFiles(googleFiles);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Drive Sync Failed',
        description: 'Could not retrieve your Google Slides files. Try logging in again.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  if (!hasToken) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
        <Presentation className="size-12 text-white/10" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Authentication Required</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => router.push('/login')}
          className="border-white/10 hover:bg-white/5 text-white/50"
        >
          <LogIn className="mr-2 h-3 w-3" /> Connect Google
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/20">
        <Loader2 className="size-8 animate-spin mb-2" />
        <p className="text-xs font-bold uppercase tracking-widest">Syncing Drive...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 flex items-center justify-between border-b border-white/5 bg-white/5">
        <h2 className="text-xs font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
          <Presentation className="h-4 w-4 text-blue-400" /> Google Slides
        </h2>
        <Button size="icon" variant="ghost" onClick={loadFiles} className="h-8 w-8 text-white/30 hover:text-white">
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      <ScrollArea className="flex-grow">
        <div className="p-4 space-y-2">
          {files.length === 0 ? (
            <div className="text-center p-8 border-2 border-dashed border-white/5 rounded-2xl">
              <p className="text-[10px] text-white/20 font-bold uppercase">No Slides Found</p>
            </div>
          ) : (
            files.map((file) => (
              <button
                key={file.id}
                onClick={() => onFileSelect(file.id)}
                className="w-full text-left group p-4 bg-white/5 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 rounded-xl transition-all flex items-center gap-4"
              >
                <div className="h-10 w-10 bg-slate-800 rounded-lg flex items-center justify-center text-blue-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-bold truncate text-white/90 group-hover:text-blue-400 transition-colors">{file.name}</p>
                  <p className="text-[10px] font-mono text-white/30 uppercase mt-0.5">
                    Updated: {new Date(file.modifiedTime).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
