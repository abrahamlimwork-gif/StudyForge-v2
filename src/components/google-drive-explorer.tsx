"use client";

import { useState, useEffect } from 'react';
import { fetchGoogleSlides } from '@/lib/google-api-utils';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { FileText, Loader2, RefreshCw, Presentation, ShieldCheck, ExternalLink, AlertCircle, Lock, Bug, Plus, Info } from 'lucide-react';
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

  const handleConnect = async () => {
    if (!auth) return;
    
    localStorage.removeItem('google_access_token');
    setLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      // Using drive.file to bypass restricted scope verification
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.addScope('https://www.googleapis.com/auth/presentations');
      
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (credential?.accessToken) {
        localStorage.setItem('google_access_token', credential.accessToken);
        setHasToken(true);
        toast({ 
          title: "Workspace Linked", 
          description: "Note: Use 'Advanced > Go to StudyForge' if prompted." 
        });
        await loadFiles(credential.accessToken);
      }
    } catch (err: any) {
      console.error("Connection Error:", err);
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: err.message || 'Could not connect to Google.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualImport = () => {
    if (!manualId.trim()) return;
    onFileSelect(manualId.trim());
    setManualId('');
    toast({ title: "Importing...", description: "Attempting to load Slide ID directly." });
  };

  useEffect(() => {
    loadFiles();
  }, []);

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
              Google reported a permission issue. Ensure Drive API is enabled.
            </p>
          </div>

          <div className="w-full bg-black/40 p-4 rounded-xl border border-white/5 text-left font-mono text-[9px] text-red-300 overflow-auto max-h-[150px]">
            {apiError.body}
          </div>

          <div className="w-full space-y-3 pt-4">
            <Button 
              onClick={() => window.open('https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=210492515699', '_blank')}
              className="w-full h-12 border border-white/10 hover:bg-white/5 text-white/80 font-bold text-[10px] uppercase tracking-widest rounded-xl"
            >
              <ExternalLink className="mr-2 h-4 w-4" /> Enable Drive API
            </Button>
            <Button variant="ghost" onClick={() => loadFiles()} className="w-full h-10 text-[9px] uppercase font-black text-blue-400">
              <RefreshCw className="mr-2 h-3 w-3" /> Retry
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
        <Button 
          onClick={handleConnect}
          disabled={loading}
          className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs tracking-widest uppercase rounded-2xl shadow-xl shadow-blue-600/10 transition-all active:scale-95"
        >
          {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
          Connect Google Drive
        </Button>
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
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      <div className="p-4 bg-blue-600/5 border-b border-white/5">
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
        <p className="text-[8px] text-white/20 mt-2 flex items-center gap-1">
          <Info className="h-2 w-2" /> Manual import for files not created by AI.
        </p>
      </div>

      <ScrollArea className="flex-grow">
        <div className="p-4 space-y-3">
          {files.length === 0 ? (
            <div className="text-center p-10 border-2 border-dashed border-white/5 rounded-3xl opacity-20 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest">No AI Slides Yet</p>
              <p className="text-[8px] italic leading-relaxed">
                Using 'drive.file' scope: Only files created here will appear automatically.
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
          Disconnect Workspace
        </Button>
      </div>
    </div>
  );
}
