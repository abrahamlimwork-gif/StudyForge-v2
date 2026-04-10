"use client";

import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@/firebase';
import { 
  signInWithRedirect, 
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

  // 1. Handle Redirect Result and Initialization
  useEffect(() => {
    if (!auth) return;

    const checkRedirect = async () => {
      console.log('Auth Shield: Checking redirect result...');
      try {
        // Explicitly set persistence before checking result
        await setPersistence(auth, browserLocalPersistence);
        
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('Auth Shield: Redirect success for:', result.user.email);
          // Result is handled by onAuthStateChanged in the provider, 
          // but we wait for it here to prevent the UI from flashing the login form.
        }
      } catch (err: any) {
        console.error('Auth Shield: Redirect error:', err);
        setError(err.message);
        toast({
          variant: 'destructive',
          title: 'Sign In Failed',
          description: err.message || 'An error occurred during sign in.',
        });
      } finally {
        // Give the auth listener a small window to catch up
        setTimeout(() => setIsCheckingRedirect(false), 500);
      }
    };

    checkRedirect();
  }, [auth, toast]);

  // 2. Hard Lock: Redirect authenticated users AWAY from login
  useEffect(() => {
    if (!isUserLoading && user && !isCheckingRedirect) {
      console.log('Auth Shield: User active, locking route to /dashboard');
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router, isCheckingRedirect]);

  const handleGoogleLoginRedirect = async () => {
    if (!auth) return;
    setError(null);
    try {
      console.log('Auth Shield: Initiating Secure Redirect');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await setPersistence(auth, browserLocalPersistence);
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      console.error('Auth Shield: Initiation error:', err);
      setError(err.message);
    }
  };

  const handleGoogleLoginPopup = async () => {
    if (!auth) return;
    setError(null);
    try {
      console.log('Auth Shield: Initiating Popup Fallback');
      const provider = new GoogleAuthProvider();
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, provider);
      router.replace('/dashboard');
    } catch (err: any) {
      console.error('Auth Shield: Popup error:', err);
      setError(err.message);
    }
  };

  // Show Loading if we are verifying state to prevent UI flash
  if (isUserLoading || isCheckingRedirect || user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
        <Loader2 className="size-20 animate-spin text-primary" />
        <h1 className="text-5xl font-headline font-black text-primary uppercase tracking-tighter">
          Verifying Identity
        </h1>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary font-bold">
          <ShieldCheck className="size-5" />
          <span>Encrypted Auth Tunnel Active</span>
        </div>
        <p className="text-2xl text-muted-foreground max-w-md">
          Please wait while we establish a secure connection to your classroom.
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
          <CardTitle className="text-6xl font-headline font-black text-primary">StudyForge</CardTitle>
          <CardDescription className="text-2xl font-medium">Access your interactive church classroom.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-10 p-12">
          <div className="space-y-6">
            <Button 
              onClick={handleGoogleLoginRedirect} 
              className="w-full h-24 text-3xl font-black bg-primary text-white hover:bg-primary/90 flex items-center justify-center gap-4 shadow-xl rounded-2xl transition-transform active:scale-95"
            >
              Sign in with Google
            </Button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t-2 border-muted" />
              </div>
              <div className="relative flex justify-center text-xl uppercase">
                <span className="bg-background px-6 text-muted-foreground font-black">Or try fallback</span>
              </div>
            </div>

            <Button 
              onClick={handleGoogleLoginPopup}
              variant="outline"
              className="w-full h-16 text-xl font-bold border-4 hover:bg-slate-50 rounded-xl"
            >
              Alternative Login Method
            </Button>

            {error && (
              <Alert variant="destructive" className="border-4 bg-red-50">
                <InfoIcon className="size-8" />
                <AlertTitle className="text-2xl font-black uppercase mb-2">Access Denied</AlertTitle>
                <AlertDescription className="text-xl">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Alert className="bg-blue-50 border-blue-200 border-2">
              <InfoIcon className="size-6 text-blue-600" />
              <AlertTitle className="text-xl font-bold text-blue-800">Connection Guide</AlertTitle>
              <AlertDescription className="text-lg text-blue-700">
                If you see a 403 error, please ensure this domain is whitelisted in:
                <br />
                <strong>Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains</strong>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
