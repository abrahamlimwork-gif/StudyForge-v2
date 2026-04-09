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
import { InfoIcon, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  // Handle Redirect Result
  useEffect(() => {
    if (!auth) return;

    const checkRedirect = async () => {
      console.log('Login: Checking redirect result...');
      try {
        await setPersistence(auth, browserLocalPersistence);
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('Login: Redirect success for:', result.user.email);
          router.replace('/dashboard');
        }
      } catch (err: any) {
        console.error('Login: Redirect error:', err);
        setError(err.message);
        toast({
          variant: 'destructive',
          title: 'Sign In Failed',
          description: err.message || 'An error occurred during sign in.',
        });
      } finally {
        setIsCheckingRedirect(false);
      }
    };

    checkRedirect();
  }, [auth, router, toast]);

  // Handle Auth State Lock
  useEffect(() => {
    if (!isUserLoading && user && !isCheckingRedirect) {
      console.log('Login: User detected, forcing redirect to dashboard');
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router, isCheckingRedirect]);

  const handleGoogleLoginRedirect = async () => {
    if (!auth) return;
    setError(null);
    try {
      console.log('Login: Initiating Google Redirect');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      console.error('Login: Initiation error:', err);
      setError(err.message);
    }
  };

  const handleGoogleLoginPopup = async () => {
    if (!auth) return;
    setError(null);
    try {
      console.log('Login: Initiating Google Popup fallback');
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.replace('/dashboard');
    } catch (err: any) {
      console.error('Login: Popup error:', err);
      setError(err.message);
    }
  };

  // Show Loading if we are verifying state
  if (isUserLoading || isCheckingRedirect || user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
        <Loader2 className="size-16 animate-spin text-primary" />
        <h1 className="text-4xl font-headline font-bold">Verifying Connection...</h1>
        <p className="text-2xl text-muted-foreground">Please wait while we secure your session.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl border-2 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-5xl font-headline">StudyForge Login</CardTitle>
          <CardDescription className="text-2xl">Access your interactive church classroom.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-10 p-10">
          <div className="space-y-6">
            <Button 
              onClick={handleGoogleLoginRedirect} 
              className="w-full h-20 text-3xl font-bold bg-primary text-white hover:bg-primary/90 flex items-center justify-center gap-4 shadow-lg"
            >
              Sign in with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xl uppercase">
                <span className="bg-background px-4 text-muted-foreground font-bold">Or try fallback</span>
              </div>
            </div>

            <Button 
              onClick={handleGoogleLoginPopup}
              variant="outline"
              className="w-full h-16 text-xl font-bold border-2 hover:bg-slate-50"
            >
              Alternative Login Method
            </Button>

            {error && (
              <Alert variant="destructive" className="border-2">
                <InfoIcon className="size-6" />
                <AlertTitle className="text-xl font-bold">Connection Trouble</AlertTitle>
                <AlertDescription className="text-lg">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Alert className="bg-blue-50 border-blue-200">
              <InfoIcon className="size-6 text-blue-600" />
              <AlertTitle className="text-xl font-bold text-blue-800">For Administrators</AlertTitle>
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
