
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  UploadCloud,
  ShieldCheck,
  HardDrive,
  FileUp,
  CloudUpload,
  Link,
  Search,
  Folder,
  ChevronDown,
  ChevronRight,
  Trash2,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  FolderPlus,
  Save,
  X
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, deleteDoc, serverTimestamp, collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
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
  const [syncingFileIds, setSyncingFileIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [isBrowseMode, setIsBrowseMode] = useState(false);
  const [syncedMetadata, setSyncedMetadata] = useState<Record<string, any>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmRefreshId, setConfirmRefreshId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  
  const isProcessingRedirect = useRef(false);
  
  const { toast } = useToast();
  const auth = useAuth();

  // Handle Hydration and Global Drag Listener
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('studyforge_dev_token');
    if (saved) setDevToken(saved);

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDragging(true);
      }
    };
    window.addEventListener('dragenter', handleDragEnter);

    // Sync listener for Presentations
    const { firestore } = initializeFirebase();
    const q = query(collection(firestore, 'presentations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const metadata: Record<string, any> = {};
      snapshot.forEach(doc => {
        metadata[doc.id] = doc.data();
      });
      setSyncedMetadata(metadata);
    });

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      unsubscribe();
    };
  }, []);

  // Load files helper
  const loadFiles = useCallback(async () => {
    if (typeof window === 'undefined') return;
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



  useEffect(() => {
    if (mounted) loadFiles();
  }, [loadFiles, mounted]);

  const handleDevTokenChange = (val: string) => {
    setDevToken(val);
    localStorage.setItem('studyforge_dev_token', val);
  };

  const toggleFolder = (folderName: string) => {
    setOpenFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }));
  };

  const fileToDrop = (f: File) => f.name.toLowerCase().endsWith('.pdf') || f.name.toLowerCase().endsWith('.pptx');

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(fileToDrop);
    
    if (validFiles.length === 0) {
      toast({ variant: 'destructive', title: 'Invalid Format', description: 'Please drop .pdf or .pptx files.' });
      return;
    }

    for (const f of validFiles) {
      try {
        // Read the file into RAM immediately — DataTransfer is revoked after the event handler
        const buffer = await f.arrayBuffer();
        const safeFile = new File([buffer], f.name, { type: f.type });

        const localFile: GoogleFile = {
          id: `local-${f.name}-${Date.now()}`,
          name: f.name,
          modifiedTime: new Date().toISOString(),
          isLocal: true,
          rawFile: safeFile,
        };

        setLocalFiles(prev => [localFile, ...prev]);
        toast({ title: `Uploading ${f.name}...`, description: 'Syncing to Google Drive.' });
        handleSyncToDrive(localFile);
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'File Read Error', description: err.message });
      }
    }
  };

  const handleSyncToDrive = async (localFile: GoogleFile) => {
    if (typeof window === 'undefined') return;
    const token = devToken || localStorage.getItem('google_access_token');

    if (!token) {
      toast({ variant: 'destructive', title: 'Not Connected', description: 'Link Google Drive first.' });
      return;
    }
    if (!localFile.rawFile) {
      toast({ variant: 'destructive', title: 'No file data', description: 'File reference is missing.' });
      return;
    }

    console.log('[StudyForge] Starting upload for:', localFile.name, '| token length:', token.length);
    setSyncingFileIds(prev => [...prev, localFile.id]);

    try {
      const uploaded = await uploadFileToDrive(token, localFile.rawFile);
      console.log('[StudyForge] Upload success. Google File ID:', uploaded.id);

      // --- SAVE NOTES TO FIRESTORE DIRECTLY ---
      if (uploaded.notes && uploaded.notes.length > 0) {
        const { firestore } = initializeFirebase();
        await setDoc(doc(firestore, 'presentations', uploaded.id), {
          notes: uploaded.notes,
          uploadedAt: serverTimestamp(),
          originalName: uploaded.name
        });
        console.log('[StudyForge] Saved', uploaded.notes.length, 'slides of notes to Firestore.');
      }

      // Remove from local list
      setLocalFiles(prev => prev.filter(f => f.id !== localFile.id));

      // Immediately inject as a Cloud file — no reload needed
      const cloudFile: GoogleFile = {
        id: uploaded.id,
        name: uploaded.name,
        modifiedTime: new Date().toISOString(),
      };
      setFiles(prev => [cloudFile, ...prev]);

      toast({ title: '✅ Synced to Drive!', description: `"${uploaded.name}" is now in your Cloud Archive.` });
    } catch (err: any) {
      console.error('[StudyForge] Sync failed:', err.message);
      toast({ variant: 'destructive', title: 'Sync Failed', description: err.message });
    } finally {
      setSyncingFileIds(prev => prev.filter(id => id !== localFile.id));
    }
  };

  const extractNotesToFirestore = async (fileId: string, force = false) => {
    const token = devToken || localStorage.getItem('google_access_token');
    if (!token) return;

    // 1. Read-First Check (The Vault)
    if (!force && syncedMetadata[fileId]?.notes?.length > 0) {
      console.log(`[StudyForge] Notes locked for ${fileId}, skipping extraction.`);
      return;
    }

    try {
      setIsSyncing(fileId);
      console.log(`[StudyForge] Triggering notes extraction for ${fileId}...`);
      const res = await fetch('/api/extract-drive-notes', {
        method: 'POST',
        body: JSON.stringify({ fileId, accessToken: token }),
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      // 2. Integrity Guard (The Last Stand)
      // Strictly discard update if notes count is lower than known slide count
      const expectedCount = data.slideCount || syncedMetadata[fileId]?.slideCount || 0;
      if (data.notes && data.notes.length < expectedCount) {
        console.error('[StudyForge] Integrity check failed: Manual sync returned partial data.', data);
        toast({ 
          variant: "destructive", 
          title: "Sync Aborted!", 
          description: "Google returned incomplete data. Your original notes are safe." 
        });
        return;
      }

      if (data.notes && data.notes.length > 0) {
        const { firestore } = initializeFirebase();
        await setDoc(doc(firestore, 'presentations', fileId), {
          notes: data.notes,
          slideCount: data.slideCount || data.notes.length,
          userId: auth?.currentUser?.uid || 'anonymous',
          uploadedAt: serverTimestamp(),
          syncCount: (syncedMetadata[fileId]?.syncCount || 0) + 1
        }, { merge: true });
        toast({ title: "Vault Updated", description: "Fresh notes locked and verified." });
      }
    } catch (err) {
      console.error('[StudyForge] Failed to extract notes:', err);
      toast({ variant: "destructive", title: "Extraction Failed" });
    } finally {
      setIsSyncing(null);
      setConfirmRefreshId(null);
    }
  };

  const handleMoveToFolder = async (fileId: string, folderName: string) => {
    try {
      const { firestore } = initializeFirebase();
      await setDoc(doc(firestore, 'presentations', fileId), {
        folderPath: folderName.trim()
      }, { merge: true });
      setNewFolderName('');
      toast({ title: "Moved", description: folderName ? `Assigned to ${folderName}` : "Moved to Archive" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Move Failed", description: err.message });
    }
  };

  const handleDelete = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId !== fileId) {
      setConfirmDeleteId(fileId);
      setTimeout(() => setConfirmDeleteId(null), 3000); 
      return;
    }

    try {
      const { firestore } = initializeFirebase();
      await deleteDoc(doc(firestore, 'presentations', fileId));
      setConfirmDeleteId(null);
      toast({ title: "Removed from Archive", description: "Metadata deleted from Firestore." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delete Failed" });
    }
  };

  const handleConnectRedirect = async () => {
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
        toast({ title: "Drive Linked", description: "Cloud Workspace connected." });
        loadFiles();
      }
    } catch (err: any) {
      console.error("Popup Auth Error:", err);
      toast({ variant: "destructive", title: "Connection Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredFiles = useMemo(() => {
    let list = files;
    // Smart Filtering: If not in browse mode, only show synced files
    if (!isBrowseMode) {
      list = list.filter(f => syncedMetadata[f.id]);
    }
    return list.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [files, searchQuery, isBrowseMode, syncedMetadata]);

  const { recentFiles, folders, ungroupedFiles } = useMemo(() => {
    const sorted = [...filteredFiles].sort((a,b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());
    
    const top3 = sorted.slice(0, 3);
    const rest = sorted.slice(3);

    const folderMap: Record<string, GoogleFile[]> = {};
    const ungrouped: GoogleFile[] = [];

    rest.forEach(file => {
      // Priority Logic: Check folderPath first
      const manualFolder = syncedMetadata[file.id]?.folderPath;
      const prefix = file.name.split(/[-_: ]/)[0];
      const folderName = manualFolder || prefix;

      if (folderName && folderName.length > 2) {
        if (!folderMap[folderName]) folderMap[folderName] = [];
        folderMap[folderName].push(file);
      } else {
        ungrouped.push(file);
      }
    });

    const finalFolders: Record<string, GoogleFile[]> = {};
    Object.keys(folderMap).forEach(key => {
      if (folderMap[key].length > 1 || syncedMetadata[folderMap[key][0].id]?.folderPath) {
        finalFolders[key] = folderMap[key];
      } else {
        ungrouped.push(...folderMap[key]);
      }
    });

    return { recentFiles: top3, folders: finalFolders, ungroupedFiles: ungrouped };
  }, [filteredFiles, syncedMetadata]);

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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isBrowseMode ? "Search Drive..." : "Search Archive..."}
            className="h-8 pl-8 text-[10px] bg-white/5 border-white/10 text-white font-medium rounded-lg"
          />
        </div>
      </div>

      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center justify-between">
        <span className="text-[9px] font-black tracking-widest text-white/30 uppercase">
          {isBrowseMode ? "Showing Everything" : `Archive (${Object.keys(syncedMetadata).length})`}
        </span>
        <button 
          onClick={() => setIsBrowseMode(!isBrowseMode)}
          className={cn(
            "text-[9px] font-black px-2 py-1 rounded transition-all uppercase tracking-widest",
            isBrowseMode ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-white/5 text-white/40 hover:bg-white/10"
          )}
        >
          {isBrowseMode ? "Browse Active" : "Browse Drive"}
        </button>
      </div>

      {isDragging && (
        <div 
          className="fixed inset-0 z-[100] backdrop-blur-xl bg-slate-950/80 flex flex-col items-center justify-center border-4 border-blue-500/50 border-dashed"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => {
            e.preventDefault();
            // Important: only disable dragging if we actually leave the window bounds
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            if (e.clientX <= rect.left || e.clientX >= rect.right || e.clientY <= rect.top || e.clientY >= rect.bottom) {
              setIsDragging(false);
            }
          }}
          onDrop={onDrop}
        >
          <UploadCloud className="h-32 w-32 text-blue-500 animate-pulse mb-8" />
          <h2 className="text-5xl font-black text-white uppercase tracking-[0.3em]">Drop to Sync</h2>
          <p className="text-blue-400 mt-6 tracking-widest uppercase font-black text-xs">PDF or PPTX Supported</p>
        </div>
      )}

      <ScrollArea className="flex-grow">
        <div className="p-4 space-y-6">
          {localFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 flex items-center gap-2">
                <HardDrive className="h-3 w-3" /> Local HUD Files
              </h3>
              {localFiles.map((file: GoogleFile) => (
                <div key={file.id} className="group relative">
                  <div className="w-full text-left p-3 bg-blue-600/5 border border-blue-500/20 rounded-xl flex items-center gap-3">
                    <button onClick={() => onFileSelect(file.id, file.rawFile)} className="flex-grow flex items-center gap-3 min-w-0">
                      <FileText className="h-5 w-5 text-blue-400" />
                      <div className="flex-grow min-w-0">
                        <p className="text-xs font-black truncate text-white uppercase">{file.name}</p>
                        <Badge className="bg-blue-600 text-[8px] h-3 px-1">LOCAL</Badge>
                      </div>
                    </button>
                    <Button 
                      onClick={() => handleSyncToDrive(file)} 
                      disabled={syncingFileIds.includes(file.id)}
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6 text-blue-400 hover:text-white shrink-0"
                    >
                      {syncingFileIds.includes(file.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
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
            {mounted && !localStorage.getItem('google_access_token') && !devToken && (
              <Button 
                onClick={handleConnectRedirect} 
                className="w-full h-10 bg-slate-950 border border-blue-500/30 text-blue-400 font-black text-[10px] uppercase tracking-widest rounded-xl"
              >
                <Link className="mr-2 h-3 w-3" /> Link Google Drive
              </Button>
            )}

            {recentFiles.length > 0 && (
              <div className="space-y-2 mb-4">
                <span className="text-[8px] font-black uppercase text-blue-400 tracking-widest bg-blue-500/10 px-2 py-0.5 rounded ml-1">Quick Access</span>
                {recentFiles.map((file: GoogleFile) => (
                  <div key={file.id} className="group relative">
                    <button
                      onClick={() => { onFileSelect(file.id); extractNotesToFirestore(file.id); }}
                      className="w-full text-left p-3 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3 hover:bg-white/10 transition-colors"
                    >
                      <div className="relative">
                        <FileUp className="h-5 w-5 text-blue-300" />
                        {syncedMetadata[file.id] && (
                          <CheckCircle2 className="absolute -top-1 -right-1 h-3 w-3 text-green-500 fill-black" />
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="text-xs font-black truncate text-white uppercase tracking-tight">{file.name}</p>
                        <p className="text-[8px] font-mono text-white/30 uppercase mt-0.5">
                          {syncedMetadata[file.id] ? "Vault Locked • Multi-Sync Ready" : "Discovery Stream"}
                        </p>
                      </div>
                    </button>
                    {syncedMetadata[file.id] && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <Button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (confirmRefreshId === file.id) {
                              extractNotesToFirestore(file.id, true);
                            } else {
                              setConfirmRefreshId(file.id);
                              setTimeout(() => setConfirmRefreshId(null), 5000);
                            }
                          }}
                          variant="ghost" 
                          size="icon" 
                          className={cn(
                            "h-7 px-1.5 w-auto text-white/10 transition-all gap-1.5",
                            confirmRefreshId === file.id ? "bg-amber-600/20 text-amber-500 border border-amber-500/20" : "hover:text-amber-500 hover:bg-amber-500/10",
                            isSyncing === file.id && "bg-blue-600/10 text-blue-400"
                          )}
                          disabled={isSyncing === file.id}
                        >
                          {isSyncing === file.id ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              <span className="text-[7px] font-black uppercase tracking-widest">Re-syncing...</span>
                            </>
                          ) : confirmRefreshId === file.id ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span className="text-[7px] font-black uppercase tracking-widest">Overwrite?</span>
                            </>
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                        </Button>

                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/30 hover:text-white hover:bg-white/5">
                              <FolderOpen className="h-3.5 w-3.5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 bg-slate-950 border-white/10 p-3 rounded-xl shadow-2xl">
                            <div className="space-y-3">
                              <Label className="text-[9px] font-black uppercase text-blue-400">Move to Folder</Label>
                              <div className="flex gap-1">
                                <Input 
                                  placeholder="Folder Name..." 
                                  value={newFolderName} 
                                  onChange={(e) => setNewFolderName(e.target.value)}
                                  className="h-8 text-[10px] bg-white/5 border-white/10 text-white"
                                />
                                <Button onClick={() => handleMoveToFolder(file.id, newFolderName)} size="icon" className="h-8 w-8 bg-blue-600">
                                  <Save className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {[...new Set(Object.values(syncedMetadata).map((m: any) => m.folderPath).filter(Boolean))].map((f: any) => (
                                  <button key={f as string} onClick={() => handleMoveToFolder(file.id, f as string)} className="text-[8px] px-2 py-1 bg-white/5 hover:bg-blue-600/20 text-white/40 hover:text-blue-400 rounded-md border border-white/5 transition-colors uppercase font-bold">
                                    {f as string}
                                  </button>
                                ))}
                                <button onClick={() => handleMoveToFolder(file.id, "")} className="text-[8px] px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md border border-red-500/20 transition-colors uppercase font-bold">
                                  Clear
                                </button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>

                        <button 
                          onClick={(e) => handleDelete(file.id, e)}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            confirmDeleteId === file.id ? "bg-red-600 text-white" : "text-white/20 hover:text-red-500"
                          )}
                        >
                          {confirmDeleteId === file.id ? <span className="text-[8px] font-black uppercase">Sure?</span> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {Object.entries(folders as Record<string, GoogleFile[]>).map(([folderName, folderFiles]) => (
              <div key={folderName} className="space-y-1">
                <button 
                  onClick={() => toggleFolder(folderName)}
                  className="w-full text-left p-2 hover:bg-white/5 rounded-lg flex items-center gap-2 group transition-colors border border-transparent hover:border-white/5"
                >
                  <Folder className="h-4 w-4 text-blue-500 opacity-80 group-hover:opacity-100" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/70 group-hover:text-white flex-grow">{folderName} Series</span>
                  <Badge variant="secondary" className="bg-white/5 text-[9px] h-4 text-white/50 border-none">{folderFiles.length}</Badge>
                  {openFolders[folderName] ? <ChevronDown className="h-3 w-3 text-white/30" /> : <ChevronRight className="h-3 w-3 text-white/30" />}
                </button>
                
                {openFolders[folderName] && (
                  <div className="pl-4 space-y-2 py-1 border-l border-white/5 ml-3">
                    {folderFiles.map((file: GoogleFile) => (
                      <div key={file.id} className="group relative">
                        <button
                          onClick={() => { onFileSelect(file.id); extractNotesToFirestore(file.id); }}
                          className="w-full text-left p-2.5 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3 hover:bg-white/10 transition-colors"
                        >
                          <div className="relative">
                            <FileUp className="h-4 w-4 text-white/20" />
                            {syncedMetadata[file.id] && <CheckCircle2 className="absolute -top-1 -right-1 h-3 w-3 text-green-500/80 fill-black" />}
                          </div>
                          <div className="flex-grow min-w-0">
                            <p className="text-[10px] font-bold truncate text-white/90 uppercase">{file.name}</p>
                          </div>
                        </button>
                        {syncedMetadata[file.id] && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <Button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                if (confirmRefreshId === file.id) {
                                  extractNotesToFirestore(file.id, true);
                                } else {
                                  setConfirmRefreshId(file.id);
                                  setTimeout(() => setConfirmRefreshId(null), 5000);
                                }
                              }}
                              variant="ghost" 
                              size="icon" 
                              className={cn(
                                "h-6 px-1.5 w-auto text-white/10 transition-all gap-1.5",
                                confirmRefreshId === file.id ? "bg-amber-600/20 text-amber-500 border border-amber-500/20" : "hover:text-amber-500 hover:bg-amber-500/10",
                                isSyncing === file.id && "bg-blue-600/10 text-blue-400"
                              )}
                              disabled={isSyncing === file.id}
                            >
                              {isSyncing === file.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : confirmRefreshId === file.id ? (
                                <>
                                  <RefreshCw className="h-3 w-3" />
                                  <span className="text-[6px] font-black uppercase">Sure?</span>
                                </>
                              ) : (
                                <RefreshCw className="h-3 w-3" />
                              )}
                            </Button>

                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-white/10 hover:text-white">
                                  <FolderOpen className="h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-56 bg-slate-950 border-white/10 p-3 rounded-xl shadow-2xl">
                                <div className="space-y-3">
                                  <Label className="text-[9px] font-black uppercase text-blue-400">Move to Folder</Label>
                                  <div className="flex gap-1">
                                    <Input 
                                      placeholder="New Folder..." 
                                      value={newFolderName} 
                                      onChange={(e) => setNewFolderName(e.target.value)}
                                      className="h-8 text-[10px] bg-white/5 border-white/10"
                                    />
                                    <Button onClick={() => handleMoveToFolder(file.id, newFolderName)} size="icon" className="h-8 w-8 bg-blue-600">
                                      <Save className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                            <button 
                              onClick={(e) => handleDelete(file.id, e)}
                              className={cn(
                                "p-1.5 rounded-md transition-all",
                                confirmDeleteId === file.id ? "bg-red-600 text-white" : "text-white/10 hover:text-red-500"
                              )}
                            >
                              {confirmDeleteId === file.id ? <span className="text-[7px] font-black">Sure?</span> : <Trash2 className="h-3 w-3" />}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {ungroupedFiles.length > 0 && (
              <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                <span className="text-[8px] font-black uppercase text-white/30 tracking-widest ml-1">Archive</span>
                {ungroupedFiles.map((file: GoogleFile) => (
                  <div key={file.id} className="group relative">
                    <button
                      onClick={() => { onFileSelect(file.id); extractNotesToFirestore(file.id); }}
                      className="w-full text-left p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-3 hover:bg-white/10 transition-colors"
                    >
                      <FileUp className="h-5 w-5 text-white/20" />
                      <div className="flex-grow min-w-0">
                        <p className="text-xs font-black truncate text-white/70 uppercase tracking-tight">{file.name}</p>
                      </div>
                    </button>
                    {syncedMetadata[file.id] && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <Button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (confirmRefreshId === file.id) {
                              extractNotesToFirestore(file.id, true);
                            } else {
                              setConfirmRefreshId(file.id);
                              setTimeout(() => setConfirmRefreshId(null), 5000);
                            }
                          }}
                          variant="ghost" 
                          size="icon" 
                          className={cn(
                            "h-7 px-1.5 w-auto text-white/10 transition-all gap-1.5",
                            confirmRefreshId === file.id ? "bg-amber-600/20 text-amber-500 border border-amber-500/20" : "hover:text-amber-500 hover:bg-amber-500/10",
                            isSyncing === file.id && "bg-blue-600/10 text-blue-400"
                          )}
                          disabled={isSyncing === file.id}
                        >
                          {isSyncing === file.id ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              <span className="text-[7px] font-black uppercase">Re-syncing...</span>
                            </>
                          ) : confirmRefreshId === file.id ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span className="text-[7px] font-black uppercase">Overwrite?</span>
                            </>
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                        </Button>

                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/10 hover:text-white hover:bg-white/5">
                              <FolderOpen className="h-3.5 w-3.5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 bg-slate-950 border-white/10 p-3 rounded-xl shadow-2xl">
                            <div className="space-y-3">
                              <Label className="text-[9px] font-black uppercase text-blue-400">Move to Folder</Label>
                              <div className="flex gap-1">
                                <Input 
                                  placeholder="New Folder..." 
                                  value={newFolderName} 
                                  onChange={(e) => setNewFolderName(e.target.value)}
                                  className="h-8 text-[10px] bg-white/5 border-white/10"
                                />
                                <Button onClick={() => handleMoveToFolder(file.id, newFolderName)} size="icon" className="h-8 w-8 bg-blue-600">
                                  <Save className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>

                        <button 
                          onClick={(e) => handleDelete(file.id, e)}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            confirmDeleteId === file.id ? "bg-red-600 text-white" : "text-white/10 hover:text-red-500"
                          )}
                        >
                          {confirmDeleteId === file.id ? <span className="text-[7px] font-black">Confirm?</span> : <Trash2 className="h-3 w-3" />}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
