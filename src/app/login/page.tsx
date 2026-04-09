
"use client";

import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@/firebase';
import { signInWithPopup, GoogleAuthProvider, sendSignInLinkToEmail } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/dashboard');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Login Error',
        description: 'Failed to sign in with Google.',
      });
    }
  };

  const handleEmailLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/login/finish`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      toast({
        title: 'Link Sent!',
        description: 'Check your email for a special login link.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Login Error',
        description: 'Could not send login link.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (isUserLoading) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl border-2 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-5xl font-headline">Welcome Back</CardTitle>
          <CardDescription className="text-2xl">Choose how you would like to sign in to StudyForge.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-10 p-10">
          <div className="space-y-6">
            <Button 
              onClick={handleGoogleLogin} 
              className="w-full h-16 text-2xl font-bold bg-white text-black border-2 border-black hover:bg-gray-50 flex items-center justify-center gap-4"
            >
              <svg className="w-8 h-8" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xl uppercase">
                <span className="bg-background px-4 text-muted-foreground">Or use Email Link</span>
              </div>
            </div>

            <form onSubmit={handleEmailLinkLogin} className="space-y-6">
              <div className="space-y-4">
                <Label htmlFor="email" className="text-2xl font-bold">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="h-16 text-2xl px-6"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-16 text-2xl font-bold bg-primary text-white hover:bg-primary/90"
              >
                {loading ? 'Sending...' : 'Send Login Link'}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
