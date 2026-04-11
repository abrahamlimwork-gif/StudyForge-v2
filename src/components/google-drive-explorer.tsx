
"use client";

import { useState, useEffect, useCallback } from 'react';
import { fetchGoogleSlides } from '@/lib/google-api-utils';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { 
  FileText, 
  Loader2, 
  RefreshCw, 
  Presentation, 
  Lock, 
  Plus, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from 'firebase/auth';

interface GoogleFile {
  id: string;
  name: string;
  modifiedTime: string;
}

export function GoogleDriveExplorer({ onFileSelect }: { onFileSelect: (id: string) => void }) {
  const [files, setFiles] = useState<GoogleFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [manualId, setManualId] = useState('');
  
  const { toast } = useToast();
  const auth = useAuth();

  const loadFiles = useCallback(async (token?: string) => {
    const accessToken = token || localStorage.getItem('google_access_token');
    if (!accessToken) {
      setHasToken(false);
      return;
    }

    setHasToken(true);
    setLoading(true);
    setApiError(null);
    
    try {
      const googleFiles = await fetchGoogleSlides(accessToken);
      setFiles(googleFiles);
    } catch (error: any) {
      console.error("--- EXPLORER ERROR ---", error);
      if (error.status === 401) {
        console.warn("--- EXPLORER: Token invalid (401) ---");
        setHasToken(false);
        localStorage.removeItem('google_access_token');
        toast({ variant: "destructive", title: "Session Expired", description: "Please re-connect Google Drive." });
      } else {
        setApiError(error.message || "Failed to load library.");
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const existingToken = localStorage.getItem('google_access_token');
    if (existingToken) {
      setHasToken(true);
      loadFiles(existingToken);
    }
  }, [loadFiles]);

  const handleConnectPopup = async () => {
    if (!auth) return;
    setLoading(true);
    setApiError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.setCustomParameters({ prompt: 'select_account' });
      
      // Force persistence to ensure token isn't lost on refresh
      await setPersistence(auth, browserLocalPersistence);
      
      console.log("--- EXPLORER DEBUG: Launching Popup ---");
      const result = await signInWithPopup(auth, provider);
      
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem('google_access_token', credential.accessToken);
        setHasToken(true);
        loadFiles(credential.accessToken);
        toast({ title: "Workspace Linked", description: "Successfully synced with Google Drive." });
      }
    } catch (err: any) {
      console.error("--- CONNECT POPUP ERROR ---", err.code, err.message);
      if (err.code === 'auth/popup-closed-by-user') {
        toast({ 
          variant: "destructive", 
          title: "Popup Blocked", 
          description: "Browser blocked the sync window. Please enable popups." 
        });
      } else {
        setApiError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualImport = () => {
    if (!manualId.trim()) return;
    onFileSelect(manualId.trim());
    setManualId('');
  };

  if (apiError) {
    return (
      <div className="flex flex-col h-full bg-slate-950 p-8 items-center justify-center text-center space-y-6">
        <ShieldAlert className="size-12 text-red-500 opacity-50" />
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Sync Failure</p>
          <p className="text-[9px] font-mono text-white/40 max-w-[200px] leading-relaxed italic">
            {apiError}
          </p>
        </div>
        <Button variant="outline" onClick={handleConnectPopup} className="border-white/10 text-[9px] font-black uppercase tracking-widest h-10 px-6 rounded-xl">Re-Connect</Button>
      </div>
    );
  }

  if (!hasToken) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-8 bg-slate-950">
        <Lock className="size-20 text-blue-500 opacity-10" />
        <div className="space-y-4">
          <h3 className="text-xl font-black uppercase tracking-tighter text-white/90">Library Locked</h3>
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] leading-relaxed">
            Link your Google Drive to browse your presentation archive.
          </p>
        </div>
        <Button onClick={handleConnectPopup} disabled={loading} className="w-full h-16 bg-blue-600 hover:bg-blue-500 rounded-[1.25rem] font-black uppercase text-xs shadow-2xl">
          {loading ? <Loader2 className="animate-spin" /> : <><ArrowRight className="mr-2 h-4 w-4" /> Link Workspace</>}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/50">
      <div className="p-6 flex items-center justify-between border-b border-white/5 bg-slate-950/40">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-3">
          <Presentation className="h-4 w-4 text-blue-500" /> Cloud Library
        </h2>
        <Button size="icon" variant="ghost" onClick={() => loadFiles()} className="h-8 w-8 hover:bg-white/5">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        </Button>
      </div>

      <div className="p-4 flex gap-2">
        <Input 
          placeholder="Slide ID..." 
          className="h-12 text-xs bg-black/40 border-white/10 text-white font-mono rounded-xl"
          value={manualId}
          onChange={(e) => setManualId(e.target.value)}
        />
        <Button size="icon" className="bg-blue-600 h-12 w-12 shrink-0 rounded-xl" onClick={handleManualImport}>
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-grow">
        <div className="p-4 space-y-3">
          {files.map((file) => (
            <button
              key={file.id}
              onClick={() => onFileSelect(file.id)}
              className="w-full text-left p-5 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4 hover:bg-blue-600/20 hover:border-blue-500/30 transition-all group"
            >
              <FileText className="h-6 w-6 text-blue-500" />
              <div className="flex-grow min-w-0">
                <p className="text-sm font-black truncate text-white/90 uppercase tracking-tight">{file.name}</p>
                <p className="text-[9px] font-mono text-white/20 uppercase mt-1">Modified {new Date(file.modifiedTime).toLocaleDateString()}</p>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
