
"use client";

import { useState, useEffect, useRef } from 'react';
import { fetchGoogleSlides, getOrCreateLibraryFolder, uploadFileToDrive } from '@/lib/google-api-utils';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { 
  FileText, 
  Loader2, 
  RefreshCw, 
  Presentation, 
  ShieldCheck, 
  AlertCircle, 
  Lock, 
  Plus, 
  UploadCloud,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { cn } from '@/lib/utils';

interface GoogleFile {
  id: string;
  name: string;
  modifiedTime: string;
}

export function GoogleDriveExplorer({ onFileSelect }: { onFileSelect: (id: string) => void }) {
  const [files, setFiles] = useState<GoogleFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [apiError, setApiError] = useState<{ status: number; body: string } | null>(null);
  const [manualId, setManualId] = useState('');
  
  const { toast } = useToast();
  const auth = useAuth();
  const hasCheckedRedirect = useRef(false);

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
        setHasToken(false);
        localStorage.removeItem('google_access_token');
      } else {
        setApiError({ status: error.status || 500, body: error.body || error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auth || hasCheckedRedirect.current) return;

    const checkRedirect = async () => {
      hasCheckedRedirect.current = true;
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            localStorage.setItem('google_access_token', credential.accessToken);
            setHasToken(true);
            loadFiles(credential.accessToken);
          }
        } else {
          loadFiles();
        }
      } catch (err) {
        setLoading(false);
      }
    };

    checkRedirect();
  }, [auth]);

  const handleConnect = async (method: 'popup' | 'redirect') => {
    if (!auth) return;
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      await setPersistence(auth, browserLocalPersistence);

      if (method === 'popup') {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          localStorage.setItem('google_access_token', credential.accessToken);
          setHasToken(true);
          loadFiles(credential.accessToken);
        }
      } else {
        await signInWithRedirect(auth, provider);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Connection Failed', description: 'Try the Redirect button.' });
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
      <div className="flex flex-col h-full bg-slate-900 p-6 items-center justify-center text-center space-y-4">
        <AlertCircle className="size-12 text-red-400" />
        <p className="text-[9px] font-mono text-red-300">{apiError.body}</p>
        <Button variant="ghost" onClick={() => loadFiles()} className="text-blue-400 uppercase font-black text-[9px]">Retry Sync</Button>
      </div>
    );
  }

  if (!hasToken) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-center space-y-8 bg-slate-900">
        <Lock className="size-16 text-blue-500 opacity-20" />
        <h3 className="text-xl font-black uppercase text-white">Library Locked</h3>
        <div className="w-full space-y-3">
          <Button onClick={() => handleConnect('popup')} disabled={loading} className="w-full h-16 bg-blue-600 rounded-2xl font-black uppercase text-xs">Connect</Button>
          <Button variant="ghost" onClick={() => handleConnect('redirect')} disabled={loading} className="w-full text-[9px] font-black uppercase text-white/30">Use Redirect (Stable)</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="p-6 flex items-center justify-between border-b border-white/5 bg-slate-950/30">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-3">
          <Presentation className="h-4 w-4 text-blue-400" /> Slide Library
        </h2>
        <Button size="icon" variant="ghost" onClick={() => loadFiles()} className="h-8 w-8">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        </Button>
      </div>

      <div className="px-4 py-4 flex gap-2">
        <Input 
          placeholder="Paste Slide ID..." 
          className="h-10 text-[10px] bg-black/40 border-white/10 text-white font-mono"
          value={manualId}
          onChange={(e) => setManualId(e.target.value)}
        />
        <Button size="icon" className="bg-blue-600 h-10 w-10 shrink-0" onClick={handleManualImport}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-grow">
        <div className="p-4 space-y-3">
          {files.map((file) => (
            <button
              key={file.id}
              onClick={() => onFileSelect(file.id)}
              className="w-full text-left p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4 hover:bg-blue-600/10 transition-all"
            >
              <FileText className="h-6 w-6 text-blue-500" />
              <div className="flex-grow min-w-0">
                <p className="text-sm font-bold truncate text-white/90">{file.name}</p>
                <p className="text-[10px] font-mono text-white/20 uppercase">{new Date(file.modifiedTime).toLocaleDateString()}</p>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
