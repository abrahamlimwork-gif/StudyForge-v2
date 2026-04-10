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
import { Plus, Video, Calendar, BookOpen, Sparkles } from 'lucide-react';
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

  const sessionsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'users', user.uid, 'sessions'), 
      orderBy('createdAt', 'desc')
    );
  }, [db, user]);

  const { data: sessions, isLoading: isSessionsLoading } = useCollection<Session>(sessionsQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

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

  if (isUserLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto py-12 px-6">
        <header className="mb-12 space-y-4">
          <h1 className="text-5xl font-headline text-primary">Your Teaching Dashboard</h1>
          <p className="text-2xl text-muted-foreground">Welcome back, {user.displayName || user.email}.</p>
        </header>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1 space-y-8">
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-primary/5">
                <CardTitle className="text-3xl flex items-center gap-3 text-primary">
                  <Plus className="size-8" />
                  New Session
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                <form onSubmit={handleCreateSession} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="topic" className="text-xl font-bold">Lesson Topic</Label>
                    <Input 
                      id="topic" 
                      placeholder="e.g. Hope in Hard Times" 
                      className="h-14 text-xl"
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-16 text-2xl bg-accent hover:bg-accent/90 font-bold text-white shadow-md">
                    Create & Start
                  </Button>
                </form>
              </CardContent>
            </Card>

            <LessonPrompts />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-3xl font-headline flex items-center gap-3 mb-6">
              <Calendar className="size-8 text-primary" />
              Recent Sessions
            </h2>
            
            {isSessionsLoading ? (
              <div className="text-2xl text-muted-foreground">Loading sessions...</div>
            ) : !sessions || sessions.length === 0 ? (
              <Card className="border-dashed border-4 p-12 text-center">
                <CardContent>
                  <BookOpen className="size-16 mx-auto text-muted mb-4" />
                  <p className="text-2xl text-muted-foreground">No sessions yet. Create one to begin!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {sessions.map((session) => (
                  <Card key={session.id} className="border-2 hover:border-primary transition-all shadow-md overflow-hidden group">
                    <div className="flex flex-col md:flex-row items-center p-8 gap-8">
                      <div className="bg-primary/10 rounded-xl p-6 group-hover:bg-primary/20 transition-colors">
                        <Video className="size-12 text-primary" />
                      </div>
                      <div className="flex-grow text-center md:text-left space-y-2">
                        <h3 className="text-3xl font-bold text-primary">{session.name}</h3>
                        <p className="text-xl text-muted-foreground font-mono">Room ID: {session.jitsiRoomName}</p>
                      </div>
                      <Button 
                        size="lg" 
                        className="h-16 px-10 text-2xl font-bold bg-primary text-white"
                        onClick={() => router.push(`/classroom/${session.jitsiRoomName}`)}
                      >
                        Join Room
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
