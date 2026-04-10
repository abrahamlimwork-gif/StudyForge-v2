"use client";

import { useState, useEffect } from 'react';
import { fetchGoogleSlides } from '@/lib/google-api-utils';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { FileText, Loader2, RefreshCw, Presentation, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

interface GoogleFile {
  id: string;
  name: string;
  modifiedTime: string;
}

export function GoogleDriveExplorer({ onFileSelect }: { onFileSelect: (id: string) => void }) {
  const [files, setFiles] = useState<GoogleFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();

  const loadFiles = async (token?: string) => {
    const accessToken = token || localStorage.getItem('google_access_token');
    if (!accessToken) {
      setHasToken(false);
      return;
    }

    setHasToken(true);
    setLoading(true);
    try {
      const googleFiles = await fetchGoogleSlides(accessToken);
      setFiles(googleFiles);
    } catch (error: any) {
      console.error('Drive fetch error:', error);
      // Only clear token if it's explicitly an auth error (401/403)
      if (error.message.includes('401') || error.message.includes('403')) {
        setHasToken(false);
        localStorage.removeItem('google_access_token');
      }
      toast({
        variant: 'destructive',
        title: 'Library Sync Failed',
        description: 'Could not retrieve slides. Please reconnect your account.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      // Required scopes for StudyForge AI and presentation HUD
      // Added drive.metadata.readonly to allow listing existing files not created by this app
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');
      provider.addScope('https://www.googleapis.com/auth/presentations');
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (credential?.accessToken) {
        localStorage.setItem('google_access_token', credential.accessToken);
        setHasToken(true);
        toast({ 
          title: "Workspace Connected", 
          description: `Logged in as ${result.user.displayName}. Syncing your Drive now.` 
        });
        await loadFiles(credential.accessToken);
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: err.message || 'Could not connect to Google.',
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
      <div className="flex flex-col items-center justify-center h-full p-10 text-center space-y-6">
        <div className="p-6 bg-blue-500/10 rounded-full border border-blue-500/20">
          <Presentation className="size-12 text-blue-400" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Library Locked</p>
          <p className="text-sm text-white/20 italic">Connect your Google Drive to access your slides and sermon notes.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleConnect}
          disabled={loading}
          className="w-full h-14 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 font-black text-xs tracking-widest uppercase rounded-2xl transition-all"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
          Connect Google Drive
        </Button>
      </div>
    );
  }

  if (loading && files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/20">
        <Loader2 className="size-8 animate-spin mb-2" />
        <p className="text-[10px] font-black uppercase tracking-widest">Syncing Workspace...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="p-6 flex items-center justify-between border-b border-white/5 bg-slate-900/50">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-3">
          <Presentation className="h-4 w-4 text-blue-400" /> My Library
        </h2>
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={() => loadFiles()} 
          className="h-8 w-8 text-white/20 hover:text-white"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      <ScrollArea className="flex-grow">
        <div className="p-4 space-y-3">
          {files.length === 0 ? (
            <div className="text-center p-12 border-2 border-dashed border-white/5 rounded-3xl opacity-30">
              <p className="text-[10px] font-black uppercase tracking-widest">No Slides Found</p>
              <p className="text-[9px] mt-1">Files will appear here once you create them.</p>
            </div>
          ) : (
            files.map((file) => (
              <button
                key={file.id}
                onClick={() => onFileSelect(file.id)}
                className="w-full text-left group p-4 bg-white/5 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/20 rounded-2xl transition-all flex items-center gap-4"
              >
                <div className="h-12 w-12 bg-slate-800 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-bold truncate text-white/90 group-hover:text-blue-400 transition-colors">
                    {file.name}
                  </p>
                  <p className="text-[10px] font-mono text-white/30 uppercase mt-1">
                    Rev: {new Date(file.modifiedTime).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t border-white/5">
        <Button 
          variant="ghost" 
          onClick={() => {
            localStorage.removeItem('google_access_token');
            setHasToken(false);
          }}
          className="w-full h-10 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-red-400 hover:bg-red-400/5"
        >
          Disconnect Account
        </Button>
      </div>
    </div>
  );
}
