
"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth, useUser } from '@/firebase';
import { 
  GoogleAuthProvider, 
  setPersistence, 
  browserLocalPersistence,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ShieldCheck, CheckCircle2, AlertTriangle, Globe, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const isProcessing = useRef(false);
  
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  // Handle Redirect Result on Mount
  useEffect(() => {
    if (!auth || isProcessing.current) return;
    isProcessing.current = true;

    const captureRedirect = async () => {
      setIsSyncing(true);
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            localStorage.setItem('google_access_token', credential.accessToken);
          }
          console.log("Logged in user email:", result.user?.email);
          console.log("Access Token:", credential?.accessToken);
          toast({ title: "Login Successful", description: "Identity synchronized." });
          router.replace('/dashboard');
        } else {
          setIsSyncing(false);
        }
      } catch (err: any) {
        console.error("Redirect Capture Error:", err);
        setError(err.message);
        setIsSyncing(false);
      }
    };

    captureRedirect();
  }, [auth, router, toast]);

  // Automatic redirect if already logged in
  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleRedirectLogin = async () => {
    if (!auth) return;
    setError(null);
    setUnauthorizedDomain(null);
    setIsLoggingIn(true);
    
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.setCustomParameters({ prompt: 'select_account' });
      
      await setPersistence(auth, browserLocalPersistence);
      await signInWithRedirect(auth, provider);
      // Browser will redirect now...
    } catch (err: any) {
      console.error("Login Error:", err.code, err.message);
      if (err.code === 'auth/unauthorized-domain') {
        setUnauthorizedDomain(window.location.hostname);
      } else {
        setError(err.message);
      }
      setIsLoggingIn(false);
    }
  };

  if (isUserLoading || isSyncing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-8">
        <Loader2 className="size-24 animate-spin text-blue-500 opacity-50" />
        <p className="text-blue-400 font-bold uppercase text-[10px] tracking-[0.3em]">
          {isSyncing ? "Synchronizing BibleSync.AI..." : "Checking Session..."}
        </p>
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
            onClick={handleRedirectLogin} 
            disabled={isLoggingIn}
            className="w-full h-20 text-xl font-black bg-white text-slate-900 hover:bg-slate-100 rounded-[1.5rem] shadow-xl group"
          >
            {isLoggingIn ? <Loader2 className="mr-3 animate-spin" /> : <CheckCircle2 className="mr-3 text-blue-600" />}
            STABLE REDIRECT LOGIN
            <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
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
