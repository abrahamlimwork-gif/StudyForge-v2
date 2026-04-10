"use client";

import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@/firebase';
import { 
  GoogleAuthProvider, 
  setPersistence, 
  browserLocalPersistence,
  signInWithPopup
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, Loader2, ShieldCheck, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleGoogleLogin = async () => {
    if (!auth) return;
    
    localStorage.removeItem('google_access_token');
    setError(null);
    setIsLoggingIn(true);
    
    try {
      const provider = new GoogleAuthProvider();
      
      // Strict scopes for drive.file (non-restricted)
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.addScope('https://www.googleapis.com/auth/presentations');
      
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, provider);
      
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem('google_access_token', credential.accessToken);
        toast({ 
          title: "Workspace Authorized", 
          description: `Note: Click 'Advanced > Go to StudyForge' if prompted by Google.` 
        });
      }
      
      router.push('/dashboard');
    } catch (err: any) {
      console.error("Google Auth Error Detail:", err);
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: err.message,
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
        <Loader2 className="size-20 animate-spin text-primary" />
        <h1 className="text-5xl font-black text-primary uppercase tracking-tighter">
          Synchronizing...
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
            <Button 
              onClick={handleGoogleLogin} 
              disabled={isLoggingIn}
              className="w-full h-28 text-4xl font-black bg-white text-slate-900 hover:bg-slate-100 flex items-center justify-center gap-6 shadow-2xl rounded-[2rem] transition-all hover:scale-[1.02] active:scale-95"
            >
              {isLoggingIn ? (
                <Loader2 className="size-10 animate-spin" />
              ) : (
                <>
                  <svg className="size-10" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Sign in with Google</span>
                </>
              )}
            </Button>

            <Alert className="bg-blue-600/10 border-blue-600/20 text-blue-400 p-6 rounded-2xl">
              <InfoIcon className="size-6" />
              <AlertTitle className="text-sm font-black uppercase tracking-widest mb-2">Bypass Verification</AlertTitle>
              <AlertDescription className="text-xs leading-relaxed italic">
                Because this app is in development, Google will show a "Google hasn't verified this app" screen. 
                Click <span className="font-bold text-white underline mx-1">Advanced</span> then 
                <span className="font-bold text-white underline mx-1">Go to StudyForge (unsafe)</span> to proceed.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 text-red-400">
                <InfoIcon className="size-6" />
                <AlertTitle className="text-xl font-black uppercase">Auth Error</AlertTitle>
                <AlertDescription className="text-lg font-mono text-[10px] break-all">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col items-center gap-4 text-slate-500 italic text-center">
              <div className="flex items-center gap-2">
                <Mail className="size-5" />
                <span className="text-sm font-bold uppercase tracking-widest">Workspace HUD v3.5</span>
              </div>
              <p className="max-w-md text-[10px] leading-relaxed">
                Uses 'drive.file' scope for secure AI slide generation in Project 210492515699.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
