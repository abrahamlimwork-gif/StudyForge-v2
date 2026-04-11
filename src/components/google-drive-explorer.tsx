
"use client";

import { useState, useEffect, useRef } from 'react';
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
  AlertCircle,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { cn } from '@/lib/utils';

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
  const redirectCheckRef = useRef(false);

  const loadFiles = async (token?: string) => {
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
      if (error.status === 401) {
        console.warn("--- EXPLORER: Token expired (401) ---");
        setHasToken(false);
        localStorage.removeItem('google_access_token');
      } else {
        setApiError(error.body || error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auth || redirectCheckRef.current) return;

    const checkRedirect = async () => {
      redirectCheckRef.current = true;
      try {
        console.log("--- EXPLORER: Checking for redirect handshake ---");
        const result = await getRedirectResult(auth);
        
        if (result) {
          console.log("--- EXPLORER: Handshake captured! ---");
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            localStorage.setItem('google_access_token', credential.accessToken);
            setHasToken(true);
            loadFiles(credential.accessToken);
            toast({ title: "Workspace Linked", description: "Successfully synchronized with Google Drive." });
            return;
          }
        }
        
        // No redirect result, check if we already have a token
        const existingToken = localStorage.getItem('google_access_token');
        if (existingToken) {
          setHasToken(true);
          loadFiles(existingToken);
        }
      } catch (err) {
        console.error("--- EXPLORER REDIRECT ERROR ---", err);
        loadFiles();
      }
    };

    checkRedirect();
  }, [auth]);

  const handleConnect = async () => {
    if (!auth) return;
    setLoading(true);
    try {
      console.log("--- EXPLORER: Initiating secure redirect ---");
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      await setPersistence(auth, browserLocalPersistence);
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      console.error("--- EXPLORER CONNECT ERROR ---", err);
      toast({ variant: 'destructive', title: 'Handshake Failed', description: err.message });
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
          <p className="text-[9px] font-mono text-white/40 max-w-[200px] leading-relaxed">
            The Google API rejected the connection. You may need to re-authenticate.
          </p>
        </div>
        <Button variant="outline" onClick={handleConnect} className="border-white/10 text-[9px] font-black uppercase tracking-widest h-10 px-6 rounded-xl">Re-Connect</Button>
      </div>
    );
  }

  if (!hasToken) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-8 bg-slate-950">
        <div className="relative">
          <Lock className="size-20 text-blue-500 opacity-10" />
          <Loader2 className="absolute inset-0 size-20 text-blue-500/20 animate-spin-slow" />
        </div>
        <div className="space-y-4">
          <h3 className="text-xl font-black uppercase tracking-tighter text-white/90">Workspace Locked</h3>
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] leading-relaxed">
            Identity verification required to synchronize your archive.
          </p>
        </div>
        <Button onClick={handleConnect} disabled={loading} className="w-full h-16 bg-blue-600 hover:bg-blue-500 rounded-[1.25rem] font-black uppercase text-xs shadow-2xl shadow-blue-600/20">
          {loading ? <Loader2 className="animate-spin" /> : <><ArrowRight className="mr-2 h-4 w-4" /> Link Google Drive</>}
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
          placeholder="Presentation ID..." 
          className="h-12 text-xs bg-black/40 border-white/10 text-white font-mono rounded-xl focus:ring-blue-500/20"
          value={manualId}
          onChange={(e) => setManualId(e.target.value)}
        />
        <Button size="icon" className="bg-blue-600 h-12 w-12 shrink-0 rounded-xl" onClick={handleManualImport}>
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-grow">
        <div className="p-4 space-y-3">
          {files.length === 0 && !loading && (
            <div className="py-20 text-center space-y-4 opacity-10">
              <FileText className="size-16 mx-auto" />
              <p className="text-[10px] font-black uppercase tracking-widest">Archive Empty</p>
            </div>
          )}
          {files.map((file) => (
            <button
              key={file.id}
              onClick={() => onFileSelect(file.id)}
              className="w-full text-left p-5 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4 hover:bg-blue-600/20 hover:border-blue-500/30 transition-all group"
            >
              <div className="bg-blue-500/10 p-3 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <FileText className="h-6 w-6 text-blue-500 group-hover:text-white" />
              </div>
              <div className="flex-grow min-w-0">
                <p className="text-sm font-black truncate text-white/90 group-hover:text-white uppercase tracking-tight">{file.name}</p>
                <p className="text-[9px] font-mono text-white/20 uppercase mt-1">Modified {new Date(file.modifiedTime).toLocaleDateString()}</p>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
