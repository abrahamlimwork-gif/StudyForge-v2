
"use client";

import { useState, useEffect } from 'react';
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
  ExternalLink, 
  AlertCircle, 
  Lock, 
  Plus, 
  UploadCloud,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
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
      setApiError({
        status: error.status || 500,
        body: error.body || error.message
      });

      if (error.status === 401) {
        setHasToken(false);
        localStorage.removeItem('google_access_token');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Redirect Result on Mount
  useEffect(() => {
    if (!auth) return;

    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            localStorage.setItem('google_access_token', credential.accessToken);
            setHasToken(true);
            await loadFiles(credential.accessToken);
            toast({ title: "Sync Active", description: "Google Workspace linked via redirect." });
          }
        }
      } catch (err: any) {
        console.error("Explorer Redirect Error:", err);
      }
    };

    checkRedirect();
    loadFiles();
  }, [auth]);

  const handleConnect = async (method: 'popup' | 'redirect' = 'popup') => {
    if (!auth) return;
    
    localStorage.removeItem('google_access_token');
    setLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      if (method === 'popup') {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        
        if (credential?.accessToken) {
          localStorage.setItem('google_access_token', credential.accessToken);
          setHasToken(true);
          toast({ 
            title: "Workspace Linked", 
            description: "Syncing library..." 
          });
          await loadFiles(credential.accessToken);
        }
      } else {
        await signInWithRedirect(auth, provider);
      }
    } catch (err: any) {
      console.error("Connection Error:", err);
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: err.code === 'auth/popup-closed-by-user' 
          ? 'Popup blocked. Please try Redirect method.'
          : err.message || 'Could not connect to Google.',
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
      toast({ variant: 'destructive', title: "Not Connected", description: "Please link your Google account first." });
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      const isAllowed = file.name.endsWith('.pptx') || file.name.endsWith('.pdf');
      if (!isAllowed) {
        toast({ variant: 'destructive', title: "Unsupported File", description: "Please drop a .pptx or .pdf file." });
        return;
      }

      setUploading(true);
      toast({ title: "Uploading...", description: `Preparing ${file.name} for Drive.` });

      try {
        const folderId = await getOrCreateLibraryFolder(token);
        await uploadFileToDrive(token, file, folderId);
        
        toast({ 
          title: "Upload Successful!", 
          description: "File added to StudyForge_Library.",
          action: <CheckCircle2 className="text-green-500" />
        });
        
        await loadFiles(token);
      } catch (err: any) {
        console.error("Upload Error:", err);
        toast({ variant: 'destructive', title: "Upload Failed", description: "Check Drive API permissions or re-authenticate." });
      } finally {
        setUploading(false);
      }
    }
  };

  const handleManualImport = () => {
    if (!manualId.trim()) return;
    onFileSelect(manualId.trim());
    setManualId('');
    toast({ title: "Importing...", description: "Attempting to load Slide ID directly." });
  };

  if (apiError) {
    return (
      <div className="flex flex-col h-full bg-slate-900 p-6 overflow-hidden">
        <div className="flex-grow flex flex-col items-center justify-center text-center space-y-6">
          <div className="p-4 bg-red-500/10 rounded-full border border-red-500/20">
            <AlertCircle className="size-12 text-red-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Sync Failed ({apiError.status})</h3>
            <p className="text-[10px] text-white/40 italic leading-relaxed">
              Google reported an issue. Ensure Drive API is enabled in your Google Cloud Console.
            </p>
          </div>

          <ScrollArea className="w-full bg-black/40 p-4 rounded-xl border border-white/5 text-left font-mono text-[9px] text-red-300 max-h-[150px]">
            <pre className="whitespace-pre-wrap">{apiError.body}</pre>
          </ScrollArea>

          <div className="w-full space-y-3 pt-4">
            <Button 
              onClick={() => window.open('https://console.developers.google.com/apis/api/drive.googleapis.com/overview', '_blank')}
              className="w-full h-12 border border-white/10 hover:bg-white/5 text-white/80 font-bold text-[10px] uppercase tracking-widest rounded-xl"
            >
              <ExternalLink className="mr-2 h-4 w-4" /> Enable Drive API
            </Button>
            <Button variant="ghost" onClick={() => loadFiles()} className="w-full h-10 text-[9px] uppercase font-black text-blue-400">
              <RefreshCw className="mr-2 h-3 w-3" /> Retry Sync
            </Button>
          </div>
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
            className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs tracking-widest uppercase rounded-2xl shadow-xl shadow-blue-600/10 transition-all active:scale-95"
          >
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
            Connect with Popup
          </Button>
          <Button 
            variant="ghost"
            onClick={() => handleConnect('redirect')}
            disabled={loading}
            className="w-full h-10 text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white"
          >
            Use Redirect (Fallback)
          </Button>
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
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={() => loadFiles()} 
          className="h-8 w-8 text-white/20 hover:text-white"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        </Button>
      </div>

      <div 
        className={cn(
          "m-4 p-8 border-2 border-dashed rounded-3xl transition-all flex flex-col items-center justify-center text-center space-y-3 relative group",
          dragActive ? "border-blue-500 bg-blue-500/10 scale-[1.02]" : "border-white/5 bg-black/20 hover:border-white/10",
          uploading && "opacity-50 pointer-events-none"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {uploading ? (
          <Loader2 className="size-8 text-blue-400 animate-spin" />
        ) : (
          <UploadCloud className={cn("size-8 transition-colors", dragActive ? "text-blue-400" : "text-white/10 group-hover:text-white/20")} />
        )}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
            {uploading ? "Syncing to Drive..." : "Drop to Upload"}
          </p>
          <p className="text-[8px] text-white/10 mt-1 uppercase font-bold">.pptx or .pdf only</p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="flex gap-2">
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
      </div>

      <ScrollArea className="flex-grow">
        <div className="p-4 space-y-3">
          {files.length === 0 ? (
            <div className="text-center p-10 border-2 border-dashed border-white/5 rounded-3xl opacity-20 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest">No Slides Found</p>
              <p className="text-[8px] italic leading-relaxed">
                Drop a file above to begin your library.
              </p>
            </div>
          ) : (
            files.map((file) => (
              <button
                key={file.id}
                onClick={() => onFileSelect(file.id)}
                className="w-full text-left group p-4 bg-white/5 hover:bg-blue-600/10 border border-white/5 hover:border-blue-600/20 rounded-2xl transition-all flex items-center gap-4"
              >
                <div className="h-12 w-12 bg-slate-800 rounded-xl flex items-center justify-center text-blue-500 shrink-0 shadow-inner">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-bold truncate text-white/90 group-hover:text-blue-400 transition-colors">
                    {file.name}
                  </p>
                  <p className="text-[10px] font-mono text-white/20 uppercase mt-1">
                    {new Date(file.modifiedTime).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t border-white/5 bg-slate-950/20">
        <Button 
          variant="ghost" 
          onClick={() => {
            localStorage.removeItem('google_access_token');
            setHasToken(false);
            setFiles([]);
            setApiError(null);
            toast({ title: "Account Unlinked", description: "Google session cleared." });
          }}
          className="w-full h-10 text-[9px] font-black uppercase tracking-widest text-white/10 hover:text-red-400"
        >
          Disconnect Account
        </Button>
      </div>
    </div>
  );
}
