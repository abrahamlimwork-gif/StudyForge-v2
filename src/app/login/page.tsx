
"use client";

import { useState, useEffect } from 'react';
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
import { InfoIcon, Loader2, ShieldCheck, Mail, Globe, AlertTriangle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [isPopupClosed, setIsPopupClosed] = useState(false);
  const [useRedirect, setUseRedirect] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  // Handle Redirect Result on Mount
  useEffect(() => {
    if (!auth) return;

    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            localStorage.setItem('google_access_token', credential.accessToken);
            toast({ 
              title: "Workspace Authorized", 
              description: "Redirect sync successful." 
            });
          }
          router.replace('/dashboard');
        }
      } catch (err: any) {
        console.error("Redirect Result Error:", err);
        if (err.code === 'auth/unauthorized-domain') {
          setIsUnauthorizedDomain(true);
        } else {
          setError(err.message);
        }
      } finally {
        setIsProcessingRedirect(false);
      }
    };

    handleRedirect();
  }, [auth, router, toast]);

  useEffect(() => {
    if (!isUserLoading && user && !isProcessingRedirect) {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router, isProcessingRedirect]);

  const handleGoogleLogin = async (method: 'popup' | 'redirect' = 'popup') => {
    if (!auth) return;
    
    localStorage.removeItem('google_access_token');
    setError(null);
    setIsUnauthorizedDomain(false);
    setIsPopupClosed(false);
    setIsLoggingIn(true);
    
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      await setPersistence(auth, browserLocalPersistence);

      if (method === 'popup') {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          localStorage.setItem('google_access_token', credential.accessToken);
          toast({ 
            title: "Workspace Authorized", 
            description: "Sync active. Redirecting to HUD." 
          });
        }
        router.push('/dashboard');
      } else {
        await signInWithRedirect(auth, provider);
      }
      
    } catch (err: any) {
      console.error("Auth Error:", err);
      
      if (err.code === 'auth/unauthorized-domain') {
        setIsUnauthorizedDomain(true);
      } else if (err.code === 'auth/popup-closed-by-user') {
        setIsPopupClosed(true);
        setUseRedirect(true);
      } else {
        setError(err.message || "An unknown authentication error occurred.");
      }

      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: err.code === 'auth/popup-closed-by-user' 
          ? "Login window was blocked. Try the Redirect method." 
          : err.message,
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isUserLoading || (user && !isProcessingRedirect) || isProcessingRedirect) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <Loader2 className="size-20 animate-spin text-blue-500" />
        <h1 className="text-5xl font-black text-white uppercase tracking-tighter">
          {isProcessingRedirect ? "Completing Sync..." : "Synchronizing..."}
        </h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl border-none shadow-[0_0_100px_rgba(37,99,235,0.1)] bg-slate-900 text-white overflow-hidden relative">
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
                className="w-full h-24 text-3xl font-black bg-white text-slate-900 hover:bg-slate-100 flex items-center justify-center gap-6 shadow-2xl rounded-[2rem] transition-all hover:scale-[1.02] active:scale-95"
              >
                {isLoggingIn && !useRedirect ? (
                  <Loader2 className="size-10 animate-spin" />
                ) : (
                  <>
                    <svg className="size-8" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Sign in with Popup</span>
                  </>
                )}
              </Button>

              <Button 
                variant="outline"
                onClick={() => handleGoogleLogin('redirect')} 
                disabled={isLoggingIn}
                className="w-full h-16 text-xl font-bold border-white/10 text-white/40 hover:text-white hover:bg-white/5 rounded-2xl flex items-center justify-center gap-4"
              >
                {isLoggingIn && useRedirect ? <Loader2 className="size-6 animate-spin" /> : <ArrowRight className="size-6" />}
                Use Redirect Login (Reliable Fallback)
              </Button>
            </div>

            {isPopupClosed && (
              <Alert className="bg-amber-600/10 border-amber-600/40 text-amber-400 p-6 rounded-2xl animate-in fade-in slide-in-from-top-4">
                <AlertTriangle className="size-6" />
                <AlertTitle className="text-sm font-black uppercase tracking-widest mb-2">Popup Interrupted</AlertTitle>
                <AlertDescription className="text-xs leading-relaxed italic">
                  The login window was blocked. Please use the **Redirect Login** button above for a 100% stable connection.
                </AlertDescription>
              </Alert>
            )}

            {isUnauthorizedDomain && (
              <Alert className="bg-red-600/10 border-red-600/40 text-red-400 p-6 rounded-2xl">
                <Globe className="size-6" />
                <AlertTitle className="text-sm font-black uppercase tracking-widest mb-2">Domain Authorization Required</AlertTitle>
                <AlertDescription className="text-xs leading-relaxed italic">
                  Add <span className="font-bold text-white underline">{typeof window !== 'undefined' ? window.location.hostname : 'this domain'}</span> to your 
                  <span className="font-bold text-white"> Firebase Console > Authorized Domains</span>.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 text-red-400">
                <InfoIcon className="size-6" />
                <AlertTitle className="text-xl font-black uppercase">Auth Error</AlertTitle>
                <AlertDescription className="text-lg font-mono text-[10px] break-all">
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
