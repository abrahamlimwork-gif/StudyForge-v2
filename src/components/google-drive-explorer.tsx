"use client";

import { useState, useEffect, useCallback } from 'react';
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
  CloudUpload
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from 'firebase/auth';
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
  
  const { toast } = useToast();
  const auth = useAuth();

  useEffect(() => {
    const saved = localStorage.getItem('studyforge_dev_token');
    if (saved) setDevToken(saved);
  }, []);

  const handleDevTokenChange = (val: string) => {
    setDevToken(val);
    localStorage.setItem('studyforge_dev_token', val);
  };

  const loadFiles = useCallback(async () => {
    const token = devToken || localStorage.getItem('google_access_token');
    if (!token) return;

    setLoading(true);
    try {
      const googleFiles = await fetchGoogleSlides(token);
      setFiles(googleFiles);
    } catch (error: any) {
      console.error("Library Sync Error:", error);
      toast({ 
        variant: "destructive", 
        title: "Sync Failed", 
        description: error.status === 401 ? "Token expired. Please update Dev Token or re-auth." : "Could not load cloud library."
      });
    } finally {
      setLoading(false);
    }
  }, [devToken, toast]);

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
    toast({ title: 'Added to Local Library', description: `${validFiles.length} file(s) ready for HUD.` });
  };

  const handleSyncToDrive = async (localFile: GoogleFile) => {
    const token = devToken || localStorage.getItem('google_access_token');
    if (!token || !localFile.rawFile) {
      toast({ variant: 'destructive', title: 'Action Required', description: 'Link Google Drive or use a Dev Token to sync.' });
      return;
    }

    setSyncingFileId(localFile.id);
    try {
      await uploadFileToDrive(token, localFile.rawFile);
      toast({ title: 'Cloud Sync Successful', description: `${localFile.name} is now in your Drive.` });
      setLocalFiles(prev => prev.filter(f => f.id !== localFile.id));
      loadFiles();
    } catch (err: any) {
      console.error("Sync Error:", err);
      toast({ variant: 'destructive', title: 'Sync Failed', description: err.message });
    } finally {
      setSyncingFileId(null);
    }
  };

  const handleConnectPopup = async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem('google_access_token', credential.accessToken);
        loadFiles();
        toast({ title: "Workspace Linked" });
      }
    } catch (err: any) {
      console.error("Popup Error:", err);
      toast({ variant: "destructive", title: "Auth Failed", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50">
      <div className="p-4 border-b border-white/5 bg-blue-600/5 space-y-3">
        <label className="text-[9px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
          <ShieldCheck className="h-3 w-3" /> Dev Token (Plan B Bypass)
        </label>
        <div className="flex gap-2">
          <Input 
            value={devToken}
            onChange={(e) => handleDevTokenChange(e.target.value)}
            placeholder="Paste access_token here..."
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
          isDragging 
            ? "border-blue-500 bg-blue-500/10 scale-[0.98]" 
            : "border-white/10 bg-slate-950/40 hover:border-white/20"
        )}
      >
        <div className="bg-slate-900 p-4 rounded-2xl">
          <UploadCloud className={cn("h-8 w-8", isDragging ? "text-blue-500" : "text-white/20")} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Drop Presentation</p>
          <p className="text-[8px] font-bold text-white/10 uppercase mt-1">.PDF or .PPTX</p>
        </div>
      </div>

      <ScrollArea className="flex-grow">
        <div className="p-4 space-y-6">
          {localFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 flex items-center gap-2">
                <HardDrive className="h-3 w-3" /> Local Library
              </h3>
              {localFiles.map((file) => (
                <div key={file.id} className="group relative">
                  <div className="w-full text-left p-5 bg-blue-600/5 border border-blue-500/20 rounded-2xl flex items-center gap-4 hover:bg-blue-600/10 transition-all">
                    <button onClick={() => onFileSelect(file.id, file.rawFile)} className="flex-grow flex items-center gap-4 min-w-0">
                      <FileText className="h-6 w-6 text-blue-400" />
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black truncate text-white uppercase">{file.name}</p>
                          <Badge className="bg-blue-600 text-[8px] h-4 px-1">LOCAL</Badge>
                        </div>
                        <p className="text-[9px] font-mono text-white/20 uppercase mt-1">Ready for Sync</p>
                      </div>
                    </button>
                    <Button 
                      onClick={() => handleSyncToDrive(file)} 
                      disabled={syncingFileId === file.id}
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-blue-400 hover:text-white hover:bg-blue-600"
                    >
                      {syncingFileId === file.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => setLocalFiles(prev => prev.filter(f => f.id !== file.id))}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 flex items-center gap-2">
              <Presentation className="h-3 w-3" /> Cloud Archive
            </h3>
            {files.length === 0 && !loading && (
              <div className="p-8 text-center bg-black/20 rounded-2xl border border-white/5">
                <p className="text-[9px] font-bold text-white/10 uppercase italic">No cloud files synced.</p>
                <Button variant="link" onClick={handleConnectPopup} className="text-blue-500 text-[9px] font-black uppercase p-0 h-auto mt-2">Connect Google</Button>
              </div>
            )}
            {files.map((file) => (
              <button
                key={file.id}
                onClick={() => onFileSelect(file.id)}
                className="w-full text-left p-5 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-all"
              >
                <FileUp className="h-6 w-6 text-white/20" />
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-black truncate text-white/80 uppercase tracking-tight">{file.name}</p>
                  <p className="text-[9px] font-mono text-white/20 uppercase mt-1">Modified {new Date(file.modifiedTime).toLocaleDateString()}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
