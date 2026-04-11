
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
  Bug,
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
  const [debugLog, setDebugLog] = useState<string | null>(null);
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
      console.error('Explorer Sync Error:', error);
      if (error.status === 401) {
        setHasToken(false);
        localStorage.removeItem('google_access_token');
        toast({
          title: "Session Expired",
          description: "Please reconnect your Google Workspace.",
        });
      } else {
        setApiError({
          status: error.status || 500,
          body: error.body || error.message
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auth || hasCheckedRedirect.current) return;

    const checkRedirect = async () => {
      // Mark as checked immediately to prevent double-processing in Next.js 15
      hasCheckedRedirect.current = true;
      
      try {
        console.log("--- EXPLORER DEBUG: Checking Redirect Result ---");
        const result = await getRedirectResult(auth);
        if (result) {
          console.log("--- EXPLORER DEBUG: Redirect Success ---");
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            localStorage.setItem('google_access_token', credential.accessToken);
            setHasToken(true);
            loadFiles(credential.accessToken);
          }
        } else {
          console.log("--- EXPLORER DEBUG: No pending redirect result ---");
          loadFiles(); // Try with existing token if no redirect result
        }
      } catch (err: any) {
        console.error("--- EXPLORER DEBUG: Redirect Error ---", err.code);
        setDebugLog(`Code: ${err.code}\nMsg: ${err.message}`);
        setLoading(false);
      }
    };

    checkRedirect();
  }, [auth]);

  const handleConnect = async (method: 'popup' | 'redirect' = 'popup') => {
    if (!auth) return;
    
    setLoading(true);
    setDebugLog(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.setCustomParameters({ prompt: 'select_account' });
      
      // Force persistence to ensure token survives reload
      await setPersistence(auth, browserLocalPersistence);

      if (method === 'popup') {
        console.log("--- EXPLORER DEBUG: Attempting Popup ---");
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          localStorage.setItem('google_access_token', credential.accessToken);
          setHasToken(true);
          loadFiles(credential.accessToken);
        }
      } else {
        console.log("--- EXPLORER DEBUG: Starting Redirect flow ---");
        await signInWithRedirect(auth, provider);
      }
    } catch (err: any) {
      console.error("--- EXPLORER DEBUG: Connect Error ---", err.code);
      setDebugLog(`Code: ${err.code}\nMsg: ${err.message}`);
      
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: err.code === 'auth/unauthorized-domain' 
          ? 'Popup was blocked. Please use the Redirect button.'
          : 'Detailed debug info logged below.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const token = localStorage.getItem('google_access_token');
    if (!token) {
      toast({ variant: 'destructive', title: "Not Connected", description: "Link your Google account first." });
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const isAllowed = file.name.endsWith('.pptx') || file.name.endsWith('.pdf');
      if (!isAllowed) {
        toast({ variant: 'destructive', title: "Unsupported File", description: "Use .pptx or .pdf." });
        return;
      }

      setUploading(true);
      try {
        const folderId = await getOrCreateLibraryFolder(token);
        await uploadFileToDrive(token, file, folderId);
        toast({ title: "Upload Successful!", description: "File added to StudyForge_Library." });
        loadFiles(token);
      } catch (err: any) {
        console.error("Upload Error:", err);
        toast({ variant: 'destructive', title: "Upload Failed", description: "Verify Drive permissions." });
      } finally {
        setUploading(false);
      }
    }
  };

  const handleManualImport = () => {
    if (!manualId.trim()) return;
    onFileSelect(manualId.trim());
    setManualId('');
  };

  if (apiError) {
    return (
      <div className="flex flex-col h-full bg-slate-900 p-6">
        <div className="flex-grow flex flex-col items-center justify-center text-center space-y-6">
          <AlertCircle className="size-12 text-red-400" />
          <h3 className="text-sm font-black uppercase tracking-widest text-white">Sync Failed</h3>
          <ScrollArea className="w-full bg-black/40 p-4 rounded-xl text-left font-mono text-[9px] text-red-300 max-h-[150px]">
            <pre className="whitespace-pre-wrap">{apiError.body}</pre>
          </ScrollArea>
          <Button variant="ghost" onClick={() => loadFiles()} className="w-full text-blue-400 uppercase font-black text-[9px]">
            <RefreshCw className="mr-2 h-3 w-3" /> Retry Sync
          </Button>
        </div>
      </div>
    );
  }

  if (!hasToken) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-center space-y-8 bg-slate-900">
        <div className="p-8 bg-blue-600/10 rounded-[2rem] border border-blue-600/20">
          <Lock className="size-16 text-blue-500" />
        </div>
        <div className="space-y-4">
          <h3 className="text-xl font-black uppercase tracking-tighter text-white">Library Locked</h3>
          <p className="text-sm text-white/30 italic">Connect your Workspace to access your sermon slides.</p>
        </div>
        <div className="w-full space-y-3">
          <Button 
            onClick={() => handleConnect('popup')}
            disabled={loading}
            className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs tracking-widest uppercase rounded-2xl"
          >
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
            Connect with Google
          </Button>
          <Button 
            variant="ghost"
            onClick={() => handleConnect('redirect')}
            disabled={loading}
            className="w-full h-10 text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white"
          >
            Use Redirect (Fallback)
          </Button>
          {debugLog && (
            <div className="mt-4 p-4 bg-black/40 rounded-xl border border-blue-500/20 text-left font-mono text-[8px] text-blue-300">
              <div className="flex items-center gap-2 mb-2 uppercase font-black tracking-widest opacity-50">
                <Bug className="size-3" /> Auth Debug Log
              </div>
              <pre className="whitespace-pre-wrap">{debugLog}</pre>
            </div>
          )}
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

      <div 
        className={cn(
          "m-4 p-8 border-2 border-dashed rounded-3xl transition-all flex flex-col items-center justify-center text-center space-y-3",
          dragActive ? "border-blue-500 bg-blue-500/10" : "border-white/5 bg-black/20",
          uploading && "opacity-50 pointer-events-none"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <UploadCloud className="size-8 text-white/10" />
        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Drop to Upload</p>
      </div>

      <div className="px-4 pb-4 flex gap-2">
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
      
      <div className="p-4 border-t border-white/5">
        <Button 
          variant="ghost" 
          onClick={() => {
            localStorage.removeItem('google_access_token');
            setHasToken(false);
          }}
          className="w-full text-[9px] font-black uppercase text-white/10 hover:text-red-400"
        >
          Disconnect Account
        </Button>
      </div>
    </div>
  );
}
