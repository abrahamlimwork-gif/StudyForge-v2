
"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth, useUser } from '@/firebase';
import { 
  GoogleAuthProvider, 
  setPersistence, 
  browserLocalPersistence,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ShieldCheck, Globe, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const redirectHandled = useRef(false);

  useEffect(() => {
    if (!auth || redirectHandled.current) return;

    const captureRedirect = async () => {
      redirectHandled.current = true;
      try {
        console.log("--- AUTH DEBUG: Checking Redirect Result ---");
        const result = await getRedirectResult(auth);
        if (result) {
          console.log("--- AUTH DEBUG: Redirect Success ---");
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            localStorage.setItem('google_access_token', credential.accessToken);
          }
          toast({ title: "Identity Verified", description: "Workspace synced via redirect." });
          router.replace('/dashboard');
        } else {
          console.log("--- AUTH DEBUG: No pending redirect ---");
          setIsProcessingRedirect(false);
        }
      } catch (err: any) {
        console.error("--- AUTH DEBUG: Redirect Error ---", err.code, err.message);
        if (err.code === 'auth/unauthorized-domain') {
          setUnauthorizedDomain(window.location.hostname);
        } else {
          setError(err.message);
        }
        setIsProcessingRedirect(false);
      }
    };

    captureRedirect();
  }, [auth, router, toast]);

  useEffect(() => {
    if (!isUserLoading && user && !isProcessingRedirect) {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router, isProcessingRedirect]);

  const handlePopupLogin = async () => {
    if (!auth) return;
    setError(null);
    setUnauthorizedDomain(null);
    setIsLoggingIn(true);
    
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.setCustomParameters({ prompt: 'select_account' });
      
      await setPersistence(auth, browserLocalPersistence);
      console.log("--- AUTH DEBUG: Attempting Popup ---");
      const result = await signInWithPopup(auth, provider);
      
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem('google_access_token', credential.accessToken);
      }
      
      toast({ title: "Login Successful", description: "Workspace access granted." });
      router.replace('/dashboard');
    } catch (err: any) {
      console.error("--- AUTH DEBUG: Popup Error ---");
      console.error("Code:", err.code);
      console.error("Message:", err.message);
      console.dir(err.customData);
      
      if (err.code === 'auth/unauthorized-domain') {
        setUnauthorizedDomain(window.location.hostname);
      } else if (err.code === 'auth/popup-closed-by-user') {
        toast({ variant: "destructive", title: "Popup Closed", description: "The login window was closed before completion." });
      } else {
        setError(err.message);
      }
      setIsLoggingIn(false);
    }
  };

  const handleRedirectLogin = async () => {
    if (!auth) return;
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      setError(err.message);
      setIsLoggingIn(false);
    }
  };

  if (isUserLoading || isProcessingRedirect) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-8">
        <Loader2 className="size-24 animate-spin text-blue-500 opacity-50" />
        <p className="text-blue-400 font-bold uppercase text-[10px] tracking-[0.3em]">Synchronizing Identity...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <Card className="w-full max-w-xl border-none shadow-2xl bg-slate-900 text-white relative overflow-hidden rounded-[3rem]">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
        
        <CardHeader className="text-center pt-20 pb-10">
          <div className="flex justify-center mb-8">
            <div className="bg-blue-600 p-6 rounded-[2rem] shadow-2xl shadow-blue-500/20">
              <ShieldCheck className="size-16 text-white" />
            </div>
          </div>
          <CardTitle className="text-6xl font-black uppercase tracking-tighter">STUDYFORGE</CardTitle>
          <CardDescription className="text-xl font-bold text-slate-400 mt-2">Presenter Workspace</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 p-12 pt-0">
          <Button 
            onClick={handlePopupLogin} 
            disabled={isLoggingIn}
            className="w-full h-20 text-xl font-black bg-white text-slate-900 hover:bg-slate-100 rounded-[1.5rem] shadow-xl"
          >
            {isLoggingIn ? <Loader2 className="mr-3 animate-spin" /> : <CheckCircle2 className="mr-3 text-blue-600" />}
            POPUP LOGIN
          </Button>

          <Button 
            onClick={handleRedirectLogin} 
            disabled={isLoggingIn}
            variant="outline"
            className="w-full h-16 text-xs font-black border-white/10 hover:bg-white/5 text-white/40 uppercase tracking-widest rounded-[1.5rem]"
          >
            STABLE REDIRECT (FALLBACK)
          </Button>

          {unauthorizedDomain && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-400 rounded-2xl">
              <Globe className="size-5" />
              <AlertTitle className="font-black text-[10px] uppercase tracking-widest">Unauthorized Domain</AlertTitle>
              <AlertDescription className="text-[11px] font-bold mt-2">
                Add <code className="bg-red-500/20 px-2 py-1 rounded text-white">{unauthorizedDomain}</code> to your Firebase Auth "Authorized Domains" settings.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
              <AlertTriangle className="size-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[10px] font-mono text-red-400">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
