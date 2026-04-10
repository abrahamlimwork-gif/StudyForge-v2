"use client";

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Plus, Video, Calendar, BookOpen, Sparkles, Loader2 } from 'lucide-react';
import { LessonPrompts } from '@/components/lesson-prompts';
import { generateRandomRoomName } from '@/lib/room-utils';

interface Session {
  id: string;
  name: string;
  jitsiRoomName: string;
  description: string;
  createdAt: any;
  facilitatorId: string;
}

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  
  const [newTopic, setNewTopic] = useState('');

  // 1. Auth Guard with Replace to prevent back-button loops
  useEffect(() => {
    if (!isUserLoading && !user) {
      console.log('Dashboard: No user detected, replacing with /login');
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const sessionsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'users', user.uid, 'sessions'), 
      orderBy('createdAt', 'desc')
    );
  }, [db, user]);

  const { data: sessions, isLoading: isSessionsLoading } = useCollection<Session>(sessionsQuery);

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic || !user || !db) return;

    const randomizedRoom = generateRandomRoomName();
    const sessionData = {
      name: newTopic,
      description: `Session about ${newTopic}`,
      jitsiRoomName: randomizedRoom,
      scheduledStartTime: new Date().toISOString(),
      facilitatorId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const sessionsRef = collection(db, 'users', user.uid, 'sessions');
    addDocumentNonBlocking(sessionsRef, sessionData);

    setNewTopic('');
  };

  // Show global loader while auth is resolving
  if (isUserLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
        <Loader2 className="size-16 animate-spin text-primary" />
        <h1 className="text-4xl font-headline font-bold">Loading Dashboard...</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto py-12 px-6">
        <header className="mb-12 space-y-4">
          <h1 className="text-6xl font-headline font-black text-primary tracking-tight uppercase">Teacher Dashboard</h1>
          <p className="text-2xl text-muted-foreground font-medium italic">Welcome back, {user.displayName || user.email}.</p>
        </header>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1 space-y-8">
            <Card className="border-4 shadow-xl">
              <CardHeader className="bg-primary/5 border-b-2">
                <CardTitle className="text-3xl font-black flex items-center gap-3 text-primary uppercase">
                  <Plus className="size-8" />
                  New Session
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <form onSubmit={handleCreateSession} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="topic" className="text-2xl font-black text-slate-700 uppercase">Lesson Topic</Label>
                    <Input 
                      id="topic" 
                      placeholder="e.g. Hope in Hard Times" 
                      className="h-16 text-2xl border-2 focus:ring-4"
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-20 text-3xl bg-accent hover:bg-accent/90 font-black text-white shadow-xl rounded-2xl transition-transform active:scale-95">
                    CREATE & START
                  </Button>
                </form>
              </CardContent>
            </Card>

            <LessonPrompts />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-4xl font-black flex items-center gap-4 mb-8 uppercase text-slate-800">
              <Calendar className="size-10 text-primary" />
              Recent Sessions
            </h2>
            
            {isSessionsLoading ? (
              <div className="flex items-center gap-4 p-8 bg-slate-50 rounded-2xl border-2 border-dashed">
                <Loader2 className="size-8 animate-spin text-primary" />
                <span className="text-2xl font-bold text-slate-500">Retrieving your classroom records...</span>
              </div>
            ) : !sessions || sessions.length === 0 ? (
              <Card className="border-dashed border-4 p-16 text-center bg-slate-50 rounded-3xl">
                <CardContent className="space-y-4">
                  <BookOpen className="size-24 mx-auto text-muted mb-4 opacity-30" />
                  <p className="text-3xl font-bold text-muted-foreground">Your classroom is empty.</p>
                  <p className="text-xl text-muted-foreground">Create your first teaching session to begin.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-8">
                {sessions.map((session) => (
                  <Card key={session.id} className="border-4 hover:border-primary transition-all shadow-xl overflow-hidden group rounded-3xl">
                    <div className="flex flex-col md:flex-row items-center p-10 gap-10 bg-white">
                      <div className="bg-primary/10 rounded-2xl p-8 group-hover:bg-primary/20 transition-colors">
                        <Video className="size-14 text-primary" />
                      </div>
                      <div className="flex-grow text-center md:text-left space-y-3">
                        <h3 className="text-4xl font-black text-primary leading-tight">{session.name}</h3>
                        <p className="text-2xl text-muted-foreground font-mono bg-slate-50 inline-block px-4 py-1 rounded-lg">ID: {session.jitsiRoomName}</p>
                      </div>
                      <Button 
                        size="lg" 
                        className="h-20 px-12 text-3xl font-black bg-primary text-white shadow-xl rounded-2xl transition-transform active:scale-95"
                        onClick={() => router.push(`/classroom/${session.jitsiRoomName}`)}
                      >
                        JOIN NOW
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
