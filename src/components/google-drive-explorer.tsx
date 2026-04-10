
"use client";

import { useState, useEffect } from 'react';
import { fetchGoogleSlides } from '@/lib/google-api-utils';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { FileText, Loader2, RefreshCw, Presentation, ShieldCheck, ExternalLink, AlertCircle, LogIn } from 'lucide-react';
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
  const [isApiDisabled, setIsApiDisabled] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();

  const loadFiles = async (token?: string) => {
    const accessToken = token || localStorage.getItem('google_access_token');
    if (!accessToken) {
      console.log("No access token found in localStorage.");
      setHasToken(false);
      return;
    }

    setHasToken(true);
    setLoading(true);
    setIsApiDisabled(false);
    
    try {
      console.log("Fetching Google Slides with token...");
      const googleFiles = await fetchGoogleSlides(accessToken);
      setFiles(googleFiles);
    } catch (error: any) {
      console.error('Drive fetch error:', error);
      
      const errorMessage = error.message || '';
      
      if (errorMessage.includes('403') && (errorMessage.includes('SERVICE_DISABLED') || errorMessage.includes('API has not been used'))) {
        setIsApiDisabled(true);
        toast({
          variant: 'destructive',
          title: 'Google Drive API Required',
          description: 'The Drive API is disabled in your Google Cloud Console.',
        });
        return;
      }

      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        console.warn("Unauthorized or Forbidden response. Clearing token.");
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
    
    // Clear state before connecting
    localStorage.removeItem('google_access_token');
    setLoading(true);
    
    console.log("Reconnecting Google Drive...");
    
    try {
      const provider = new GoogleAuthProvider();
      // Use minimal scopes as requested for verification
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.addScope('https://www.googleapis.com/auth/presentations');
      
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (credential?.accessToken) {
        console.log("New Access Token acquired.");
        localStorage.setItem('google_access_token', credential.accessToken);
        setHasToken(true);
        toast({ 
          title: "Workspace Connected", 
          description: `Logged in as ${result.user.displayName}. Syncing your Drive now.` 
        });
        await loadFiles(credential.accessToken);
      }
    } catch (err: any) {
      console.error("Popup Connect Error:", err);
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

  if (isApiDisabled) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
        <div className="p-6 bg-red-500/10 rounded-full border border-red-500/20">
          <AlertCircle className="size-12 text-red-400" />
        </div>
        <div className="space-y-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">API Access Required</p>
          <p className="text-sm text-white/40 italic leading-relaxed">
            The Google Drive API is not enabled for this project. Please enable it in your Google Cloud Console.
          </p>
          <Button 
            variant="outline" 
            onClick={() => window.open('https://console.developers.google.com/apis/api/drive.googleapis.com/overview', '_blank')}
            className="w-full h-12 border-white/10 hover:bg-white/5 text-white/80 font-bold text-xs uppercase tracking-widest rounded-xl"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Enable Drive API
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => handleConnect()}
            className="w-full h-12 text-[10px] uppercase font-black tracking-widest text-blue-400 hover:text-blue-300"
          >
            <RefreshCw className="mr-2 h-3 w-3" /> Reconnect Now
          </Button>
        </div>
      </div>
    );
  }

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
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
          Reconnect Google
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
              <Button 
                variant="ghost" 
                onClick={handleConnect}
                className="mt-4 text-[9px] uppercase font-black tracking-[0.2em] text-blue-400"
              >
                Refresh Connection
              </Button>
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
            console.log("Disconnecting account...");
            localStorage.removeItem('google_access_token');
            setHasToken(false);
            setFiles([]);
          }}
          className="w-full h-10 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-red-400 hover:bg-red-400/5"
        >
          Disconnect Account
        </Button>
      </div>
    </div>
  );
}
