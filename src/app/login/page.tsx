
"use client";

import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@/firebase';
import { 
  GoogleAuthProvider, 
  getRedirectResult, 
  setPersistence, 
  browserLocalPersistence,
  signInWithPopup
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, Loader2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  const GOOGLE_CLIENT_ID = "936282634116-0l3blqtgei3sglo6bop5pbbsfjqd53fu.apps.googleusercontent.com";

  useEffect(() => {
    if (!auth) return;

    const checkRedirect = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        const result = await getRedirectResult(auth);
        if (result) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            localStorage.setItem('google_access_token', credential.accessToken);
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setTimeout(() => setIsCheckingRedirect(false), 500);
      }
    };

    checkRedirect();
  }, [auth]);

  useEffect(() => {
    if (!isUserLoading && user && !isCheckingRedirect) {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router, isCheckingRedirect]);

  const handleGoogleLogin = async () => {
    if (!auth) return;
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.addScope('https://www.googleapis.com/auth/presentations');
      
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, provider);
      
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem('google_access_token', credential.accessToken);
      }
      
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: err.message,
      });
    }
  };

  if (isUserLoading || isCheckingRedirect || user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
        <Loader2 className="size-20 animate-spin text-primary" />
        <h1 className="text-5xl font-headline font-black text-primary uppercase tracking-tighter">
          Initializing Workspace
        </h1>
        <p className="text-2xl text-muted-foreground max-w-md">
          Connecting to Google Drive and Classroom services...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl border-2 shadow-2xl">
        <CardHeader className="text-center space-y-4 pt-12">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-4 rounded-2xl">
              <ShieldCheck className="size-12 text-white" />
            </div>
          </div>
          <CardTitle className="text-6xl font-headline font-black text-primary uppercase tracking-tighter">StudyForge</CardTitle>
          <CardDescription className="text-2xl font-medium">Google-Powered Church Learning HUD</CardDescription>
        </CardHeader>
        <CardContent className="space-y-10 p-12">
          <div className="space-y-6">
            <Button 
              onClick={handleGoogleLogin} 
              className="w-full h-24 text-3xl font-black bg-primary text-white hover:bg-primary/90 flex items-center justify-center gap-4 shadow-xl rounded-2xl transition-transform active:scale-95"
            >
              Sign in with Google
            </Button>

            {error && (
              <Alert variant="destructive" className="border-4 bg-red-50">
                <InfoIcon className="size-8" />
                <AlertTitle className="text-2xl font-black uppercase mb-2">Auth Error</AlertTitle>
                <AlertDescription className="text-xl">{error}</AlertDescription>
              </Alert>
            )}

            <p className="text-center text-muted-foreground italic">
              StudyForge requires access to Google Drive to manage your sermon presentations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
