
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchGoogleSlides, uploadFileToDrive } from '@/lib/google-api-utils';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  FileText, 
  Loader2, 
  RefreshCw, 
  Presentation, 
  Plus, 
  UploadCloud,
  ShieldCheck,
  HardDrive,
  FileUp,
  X,
  CloudUpload,
  Link
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { cn } from '@/lib/utils';

interface GoogleFile {
  id: string;
  name: string;
  modifiedTime: string;
  isLocal?: boolean;
  rawFile?: File;
}

interface GoogleDriveExplorerProps {
  onFileSelect: (id: string, file?: File) => void;
}

export function GoogleDriveExplorer({ onFileSelect }: GoogleDriveExplorerProps) {
  const [files, setFiles] = useState<GoogleFile[]>([]);
  const [localFiles, setLocalFiles] = useState<GoogleFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [devToken, setDevToken] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [syncingFileId, setSyncingFileId] = useState<string | null>(null);
  const isProcessingRedirect = useRef(false);
  
  const { toast } = useToast();
  const auth = useAuth();

  // Load files helper
  const loadFiles = useCallback(async () => {
    const token = devToken || localStorage.getItem('google_access_token');
    if (!token) return;

    setLoading(true);
    try {
      const googleFiles = await fetchGoogleSlides(token);
      setFiles(googleFiles);
    } catch (error: any) {
      console.error("Library Sync Error:", error);
      if (error.status === 401) {
        localStorage.removeItem('google_access_token');
        toast({ variant: "destructive", title: "Session Expired", description: "Please reconnect Google Drive." });
      } else {
        toast({ variant: "destructive", title: "Sync Failed" });
      }
    } finally {
      setLoading(false);
    }
  }, [devToken, toast]);

  // Handle Redirect Result (Next.js 15 Safe)
  useEffect(() => {
    if (!auth || isProcessingRedirect.current) return;
    isProcessingRedirect.current = true;

    const captureResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            localStorage.setItem('google_access_token', credential.accessToken);
            toast({ title: "Drive Linked", description: "Cloud Workspace ready." });
            loadFiles();
          }
        }
      } catch (err) {
        console.error("Sidebar Redirect Error:", err);
      }
    };
    captureResult();
  }, [auth, toast, loadFiles]);

  useEffect(() => {
    const saved = localStorage.getItem('studyforge_dev_token');
    if (saved) setDevToken(saved);
    loadFiles();
  }, [loadFiles]);

  const handleDevTokenChange = (val: string) => {
    setDevToken(val);
    localStorage.setItem('studyforge_dev_token', val);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.name.toLowerCase().endsWith('.pptx'));
    
    if (validFiles.length === 0) {
      toast({ variant: 'destructive', title: 'Invalid Format', description: 'Please drop .pdf or .pptx files.' });
      return;
    }

    const newLocalFiles = validFiles.map(f => ({
      id: `local-${f.name}-${Date.now()}`,
      name: f.name,
      modifiedTime: new Date().toISOString(),
      isLocal: true,
      rawFile: f
    }));

    setLocalFiles(prev => [...newLocalFiles, ...prev]);
    toast({ title: 'Local File Added' });
  };

  const handleSyncToDrive = async (localFile: GoogleFile) => {
    const token = devToken || localStorage.getItem('google_access_token');
    if (!token || !localFile.rawFile) {
      toast({ variant: 'destructive', title: 'Sync Blocked', description: 'Link Drive first.' });
      return;
    }

    setSyncingFileId(localFile.id);
    try {
      await uploadFileToDrive(token, localFile.rawFile);
      toast({ title: 'Cloud Sync Successful' });
      setLocalFiles(prev => prev.filter(f => f.id !== localFile.id));
      loadFiles();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Sync Failed', description: err.message });
    } finally {
      setSyncingFileId(null);
    }
  };

  const handleConnectRedirect = async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      await setPersistence(auth, browserLocalPersistence);
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Redirect Error", description: err.message });
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50">
      <div className="p-4 border-b border-white/5 bg-blue-600/5 space-y-3">
        <label className="text-[9px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
          <ShieldCheck className="h-3 w-3" /> Dev Token (Manual Bypass)
        </label>
        <div className="flex gap-2">
          <Input 
            value={devToken}
            onChange={(e) => handleDevTokenChange(e.target.value)}
            placeholder="Paste token here..."
            className="h-10 text-[10px] bg-black/40 border-blue-500/20 text-blue-100 font-mono rounded-xl"
          />
          <Button onClick={loadFiles} size="icon" className="h-10 w-10 shrink-0 bg-blue-600">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div 
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "m-4 p-8 border-2 border-dashed rounded-3xl transition-all flex flex-col items-center justify-center text-center space-y-4",
          isDragging ? "border-blue-500 bg-blue-500/10" : "border-white/10 bg-slate-950/40 hover:border-white/20"
        )}
      >
        <UploadCloud className={cn("h-8 w-8", isDragging ? "text-blue-500" : "text-white/20")} />
        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Drop Presentation</p>
      </div>

      <ScrollArea className="flex-grow">
        <div className="p-4 space-y-6">
          {localFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 flex items-center gap-2">
                <HardDrive className="h-3 w-3" /> Local HUD Files
              </h3>
              {localFiles.map((file) => (
                <div key={file.id} className="group relative">
                  <div className="w-full text-left p-5 bg-blue-600/5 border border-blue-500/20 rounded-2xl flex items-center gap-4">
                    <button onClick={() => onFileSelect(file.id, file.rawFile)} className="flex-grow flex items-center gap-4 min-w-0">
                      <FileText className="h-6 w-6 text-blue-400" />
                      <div className="flex-grow min-w-0">
                        <p className="text-sm font-black truncate text-white uppercase">{file.name}</p>
                        <Badge className="bg-blue-600 text-[8px] h-4 px-1">LOCAL</Badge>
                      </div>
                    </button>
                    <Button 
                      onClick={() => handleSyncToDrive(file)} 
                      disabled={syncingFileId === file.id}
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-blue-400 hover:text-white"
                    >
                      {syncingFileId === file.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 flex items-center gap-2">
              <Presentation className="h-3 w-3" /> Cloud Archive
            </h3>
            {!localStorage.getItem('google_access_token') && !devToken && (
              <Button 
                onClick={handleConnectRedirect} 
                className="w-full h-14 bg-slate-950 border border-blue-500/30 text-blue-400 font-black text-[10px] uppercase tracking-widest rounded-2xl"
              >
                <Link className="mr-2 h-4 w-4" /> Link Google Drive
              </Button>
            )}
            {files.map((file) => (
              <button
                key={file.id}
                onClick={() => onFileSelect(file.id)}
                className="w-full text-left p-5 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4 hover:bg-white/10"
              >
                <FileUp className="h-6 w-6 text-white/20" />
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-black truncate text-white/80 uppercase tracking-tight">{file.name}</p>
                  <p className="text-[9px] font-mono text-white/20 uppercase mt-1">Cloud Stream</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
