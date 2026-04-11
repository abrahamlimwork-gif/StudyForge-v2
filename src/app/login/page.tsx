
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
import { InfoIcon, Loader2, ShieldCheck, Globe, AlertTriangle, ArrowRight, Bug } from 'lucide-react';

export default function LoginPage() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [isPopupClosed, setIsPopupClosed] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const hasProcessedRedirect = useRef(false);

  useEffect(() => {
    if (!auth || hasProcessedRedirect.current) return;

    const handleRedirectResult = async () => {
      // Ensure we only try to process the redirect result once per mount
      hasProcessedRedirect.current = true;
      
      try {
        console.log("--- AUTH DEBUG: Checking Redirect Result ---");
        const result = await getRedirectResult(auth);
        
        if (result) {
          console.log("--- AUTH DEBUG: Redirect Success ---", result.user.email);
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            localStorage.setItem('google_access_token', credential.accessToken);
          }
          router.replace('/dashboard');
        } else {
          console.log("--- AUTH DEBUG: No redirect result found. ---");
          setIsProcessingRedirect(false);
        }
      } catch (err: any) {
        console.error("--- AUTH DEBUG: Redirect Error ---");
        setDebugInfo({ code: err.code, message: err.message });

        if (err.code === 'auth/unauthorized-domain') {
          setIsUnauthorizedDomain(true);
        } else {
          setError(err.message);
        }
        setIsProcessingRedirect(false);
      }
    };

    handleRedirectResult();
  }, [auth, router]);

  useEffect(() => {
    if (!isUserLoading && user && !isProcessingRedirect) {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router, isProcessingRedirect]);

  const handleGoogleLogin = async (method: 'popup' | 'redirect') => {
    if (!auth) return;
    
    setError(null);
    setDebugInfo(null);
    setIsUnauthorizedDomain(false);
    setIsPopupClosed(false);
    setIsLoggingIn(true);
    
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.setCustomParameters({ prompt: 'select_account' });
      
      await setPersistence(auth, browserLocalPersistence);

      if (method === 'popup') {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          localStorage.setItem('google_access_token', credential.accessToken);
        }
        router.push('/dashboard');
      } else {
        await signInWithRedirect(auth, provider);
      }
      
    } catch (err: any) {
      console.error("--- AUTH DEBUG: Login Exception ---", err.code);
      setDebugInfo({ code: err.code, message: err.message });

      if (err.code === 'auth/unauthorized-domain') {
        setIsUnauthorizedDomain(true);
      } else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setIsPopupClosed(true);
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isUserLoading || isProcessingRedirect) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <Loader2 className="size-20 animate-spin text-blue-500" />
        <h1 className="text-5xl font-black text-white uppercase tracking-tighter">
          {isProcessingRedirect ? "Syncing Identity..." : "Synchronizing..."}
        </h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl border-none shadow-[0_0_100px_rgba(37,99,235,0.1)] bg-slate-900 text-white overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
        
        <CardHeader className="text-center space-y-4 pt-16 pb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-5 rounded-3xl shadow-lg shadow-blue-500/20">
              <ShieldCheck className="size-16 text-white" />
            </div>
          </div>
          <CardTitle className="text-7xl font-black uppercase tracking-tighter">StudyForge</CardTitle>
          <CardDescription className="text-2xl font-bold text-slate-400">
            Professional Church Learning Workspace
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-10 p-12 pb-20">
          <div className="space-y-8">
            <div className="grid gap-4">
              <Button 
                onClick={() => handleGoogleLogin('popup')} 
                disabled={isLoggingIn}
                className="w-full h-24 text-3xl font-black bg-white text-slate-900 hover:bg-slate-100 flex items-center justify-center gap-6 shadow-2xl rounded-[2rem] transition-all"
              >
                {isLoggingIn ? <Loader2 className="size-10 animate-spin" /> : <span>Sign in with Google</span>}
              </Button>

              <Button 
                variant="outline"
                onClick={() => handleGoogleLogin('redirect')} 
                disabled={isLoggingIn}
                className="w-full h-16 text-xl font-bold border-white/10 text-white/40 hover:text-white hover:bg-white/5 rounded-2xl flex items-center justify-center gap-4"
              >
                <ArrowRight className="size-6" />
                Use Redirect (Stable Fallback)
              </Button>
            </div>

            {isPopupClosed && (
              <Alert className="bg-amber-600/10 border-amber-600/40 text-amber-400 p-6 rounded-2xl">
                <AlertTriangle className="size-6" />
                <AlertTitle className="text-sm font-black uppercase tracking-widest mb-2">Browser Restriction</AlertTitle>
                <AlertDescription className="text-xs leading-relaxed italic">
                  Popup was blocked. Please use the **Redirect (Stable Fallback)** button for a guaranteed login.
                </AlertDescription>
              </Alert>
            )}

            {isUnauthorizedDomain && (
              <Alert className="bg-red-600/10 border-red-600/40 text-red-400 p-6 rounded-2xl">
                <Globe className="size-6" />
                <AlertTitle className="text-sm font-black uppercase tracking-widest mb-2">Domain Authorization</AlertTitle>
                <AlertDescription className="text-xs leading-relaxed italic">
                  Add <span className="font-bold text-white underline">{typeof window !== 'undefined' ? window.location.hostname : 'this domain'}</span> to your Firebase Console authorized domains.
                </AlertDescription>
              </Alert>
            )}

            {debugInfo && (
              <Alert className="bg-slate-800/50 border-blue-500/20 text-blue-400 p-4 rounded-xl font-mono text-[10px]">
                <Bug className="size-4 mb-2" />
                <AlertTitle className="uppercase font-black tracking-widest mb-1">Debug Info</AlertTitle>
                <div className="space-y-1">
                  <p>CODE: {debugInfo.code}</p>
                  <p>MSG: {debugInfo.message}</p>
                </div>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
