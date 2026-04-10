
"use client";

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useUser } from '@/firebase';
import { collection, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Plus, Video, Calendar, BookOpen, Loader2, Sparkles } from 'lucide-react';
import { LessonPrompts } from '@/components/lesson-prompts';
import { generateRandomRoomName } from '@/lib/room-utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Session {
  id: string;
  name: string;
  jitsiRoomName: string;
  description: string;
  createdAt: any;
  facilitatorId: string;
}

export default function DashboardPage() {
  const db = useFirestore();
  const router = useRouter();
  const { user } = useUser();
  
  const [newTopic, setNewTopic] = useState('');

  const sessionsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'public_sessions'), 
      orderBy('createdAt', 'desc')
    );
  }, [db]);

  const { data: sessions, isLoading: isSessionsLoading } = useCollection<Session>(sessionsQuery);

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic || !db) return;

    const randomizedRoom = generateRandomRoomName();
    const sessionData = {
      name: newTopic,
      description: `Session about ${newTopic}`,
      jitsiRoomName: randomizedRoom,
      scheduledStartTime: new Date().toISOString(),
      facilitatorId: user?.uid || 'guest-teacher',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const sessionsRef = collection(db, 'public_sessions');
    addDocumentNonBlocking(sessionsRef, sessionData);

    setNewTopic('');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-7xl mx-auto py-12 px-6">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <h1 className="text-7xl font-black text-slate-900 tracking-tight uppercase">Dashboard</h1>
            <div className="flex items-center gap-4">
              <div className="h-2 w-12 bg-blue-600 rounded-full" />
              <p className="text-2xl text-slate-500 font-bold uppercase tracking-widest italic">Teaching Hub</p>
            </div>
          </div>
          
          {user && (
            <Card className="border-none bg-white shadow-xl rounded-3xl p-6 flex items-center gap-6">
              <Avatar className="size-16 border-4 border-blue-100">
                <AvatarImage src={user.photoURL || undefined} />
                <AvatarFallback className="bg-blue-600 text-white font-black text-xl">
                  {user.displayName?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Authenticated As</span>
                <span className="text-2xl font-black text-slate-800">{user.displayName}</span>
              </div>
            </Card>
          )}
        </header>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1 space-y-8">
            <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-slate-900 text-white p-10">
                <CardTitle className="text-3xl font-black flex items-center gap-4 uppercase tracking-tighter">
                  <Plus className="size-10 text-blue-400" />
                  New Session
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10 space-y-8 bg-white">
                <form onSubmit={handleCreateSession} className="space-y-8">
                  <div className="space-y-4">
                    <Label htmlFor="topic" className="text-xl font-black text-slate-400 uppercase tracking-widest">Lesson Topic</Label>
                    <Input 
                      id="topic" 
                      placeholder="e.g. The Power of Prayer" 
                      className="h-20 text-3xl border-none bg-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/20 font-bold"
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-24 text-4xl bg-blue-600 hover:bg-blue-500 font-black text-white shadow-xl shadow-blue-500/20 rounded-3xl transition-all hover:scale-[1.02] active:scale-95">
                    START TEACHING
                  </Button>
                </form>
              </CardContent>
            </Card>

            <LessonPrompts />
          </div>

          <div className="lg:col-span-2 space-y-8">
            <h2 className="text-5xl font-black flex items-center gap-5 mb-8 uppercase text-slate-800 tracking-tighter">
              <Calendar className="size-12 text-blue-600" />
              Active Records
            </h2>
            
            {isSessionsLoading ? (
              <div className="flex items-center gap-6 p-12 bg-white rounded-[2.5rem] shadow-lg">
                <Loader2 className="size-10 animate-spin text-blue-600" />
                <span className="text-3xl font-black text-slate-400 uppercase">Synchronizing...</span>
              </div>
            ) : !sessions || sessions.length === 0 ? (
              <Card className="border-none p-24 text-center bg-white shadow-lg rounded-[3rem]">
                <CardContent className="space-y-6">
                  <BookOpen className="size-32 mx-auto text-slate-100 mb-4" />
                  <p className="text-4xl font-black text-slate-300 uppercase tracking-tighter">Archive Empty</p>
                  <p className="text-xl text-slate-400 font-bold">Launch your first session to begin.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-8">
                {sessions.map((session) => (
                  <Card key={session.id} className="border-none hover:shadow-2xl transition-all shadow-lg overflow-hidden group rounded-[2.5rem]">
                    <div className="flex flex-col md:flex-row items-center p-10 gap-10 bg-white">
                      <div className="bg-slate-100 rounded-3xl p-10 group-hover:bg-blue-600 transition-colors">
                        <Video className="size-14 text-slate-400 group-hover:text-white transition-colors" />
                      </div>
                      <div className="flex-grow text-center md:text-left space-y-2">
                        <h3 className="text-4xl font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">{session.name}</h3>
                        <div className="flex items-center justify-center md:justify-start gap-3">
                          <span className="text-xs font-black uppercase tracking-widest bg-blue-100 text-blue-600 px-3 py-1 rounded-full">Public Room</span>
                          <p className="text-xl text-slate-400 font-mono font-bold">{session.jitsiRoomName}</p>
                        </div>
                      </div>
                      <Button 
                        size="lg" 
                        className="h-24 px-16 text-3xl font-black bg-slate-900 text-white shadow-xl rounded-3xl transition-all hover:bg-blue-600 hover:scale-[1.05] active:scale-95"
                        onClick={() => router.push(`/classroom/${session.jitsiRoomName}`)}
                      >
                        JOIN
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
