'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Swords, Timer, Zap, Check, Loader2, Flame, LogIn } from 'lucide-react';
import { api, fmt, fmtTimeMs, useServerClock } from '@/lib/wk';

const App = () => {
  const [route, setRoute] = useState({ name: 'home' });

  useEffect(() => {
    const parse = () => {
      const h = window.location.hash.replace(/^#/, '');
      const parts = h.split('/').filter(Boolean);
      if (parts[0] === 'join' && parts[1]) return setRoute({ name: 'join', code: parts[1].toUpperCase() });
      if (parts[0] === 'war' && parts[1]) {
        const code = parts[1].toUpperCase();
        const pid = localStorage.getItem(`wk_pid_${code}`);
        if (pid) return setRoute({ name: 'participant', code, participantId: pid });
        return setRoute({ name: 'join', code });
      }
      // Any other hash returns to home (admin is a separate URL at /admin now)
      setRoute({ name: 'home' });
    };
    parse();
    window.addEventListener('hashchange', parse);
    return () => window.removeEventListener('hashchange', parse);
  }, []);

  return (
    <div className="min-h-screen">
      {route.name === 'home' && <HomeScreen />}
      {route.name === 'join' && (
        <JoinScreen
          code={route.code}
          onJoined={(warCode, pid) => {
            localStorage.setItem(`wk_pid_${warCode}`, pid);
            window.location.hash = `war/${warCode}`;
          }}
        />
      )}
      {route.name === 'participant' && <ParticipantScreen code={route.code} participantId={route.participantId} />}
    </div>
  );
};

function HomeScreen() {
  const [code, setCode] = useState('');
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(239,68,68,0.25),transparent)]" />
      <div className="container mx-auto max-w-md px-5 py-16">
        <div className="flex items-center gap-2 text-primary mb-6">
          <Swords className="h-5 w-5" />
          <span className="text-xs tracking-[0.3em] font-semibold">WAR KELAS</span>
        </div>
        <h1 className="text-5xl font-black tracking-tight leading-none">
          Rebut<br /><span className="text-primary">Ruanganmu.</span>
        </h1>
        <p className="mt-4 text-muted-foreground">First come, first served. Buka WAR, dan siapa cepat, dia dapat.</p>
        <Card className="mt-8 border-border/60">
          <CardContent className="p-5 space-y-3">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Masuk WAR</Label>
            <div className="flex gap-2">
              <Input
                placeholder="WAR CODE"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && code && (window.location.hash = `join/${code}`)}
                className="uppercase font-mono tracking-widest text-lg h-12"
                maxLength={8}
              />
              <Button className="h-12 px-5" disabled={!code} onClick={() => { window.location.hash = `join/${code}`; }}>
                <LogIn className="h-4 w-4 mr-1" /> Join
              </Button>
            </div>
            <p className="text-xs text-muted-foreground pt-1">Belum punya WAR CODE? Tanyakan ke admin sekolahmu.</p>
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground mt-8 text-center">Real-time · Atomic · Server-authoritative</p>
      </div>
    </div>
  );
}

function JoinScreen({ code, onJoined }) {
  const [name, setName] = useState('');
  const [nisn, setNisn] = useState('');
  const [war, setWar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [requireImport, setRequireImport] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await api.get(`wars/code/${code}`);
      setLoading(false);
      if (r.ok) {
        setWar(r.war);
        setRequireImport(r.participantCount > 0);
      } else toast.error(r.error || 'WAR not found');
    })();
  }, [code]);

  const submit = async () => {
    if (!nisn.trim()) return toast.error('NISN wajib');
    if (!requireImport && !name.trim()) return toast.error('Nama wajib');
    setJoining(true);
    const r = await api.post('join', { code, nisn: nisn.trim(), name: name.trim() });
    setJoining(false);
    if (r.ok) { toast.success('Masuk lobby'); onJoined(r.warCode, r.participant.id); }
    else toast.error(r.error || 'Gagal join');
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading…</div>;
  if (!war) return <div className="p-8 text-center">WAR tidak ditemukan. <button className="underline" onClick={() => (window.location.hash = '')}>Kembali</button></div>;

  return (
    <div className="container mx-auto max-w-md px-5 py-10">
      <div className="text-center mb-6">
        <div className="text-xs tracking-[0.3em] text-primary font-semibold">WAR KELAS</div>
        <h1 className="text-3xl font-black mt-1">{war.name}</h1>
        {war.description && <p className="text-sm text-muted-foreground mt-1">{war.description}</p>}
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <Badge variant="secondary" className="font-mono">#{war.code}</Badge>
          <Badge className={war.status === 'LIVE' ? 'bg-primary animate-pulse' : 'bg-secondary text-secondary-foreground'}>{war.status}</Badge>
        </div>
      </div>
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <Label>NISN</Label>
            <Input value={nisn} onChange={(e) => setNisn(e.target.value.toUpperCase())} className="h-12 font-mono tracking-widest" placeholder="0012345678" />
            {requireImport && <p className="text-xs text-muted-foreground mt-1">Masukkan NISN kamu yang sudah didaftarkan admin.</p>}
          </div>
          {!requireImport && (
            <div>
              <Label>Nama Lengkap</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12" placeholder="Jonathan" />
            </div>
          )}
          <Button className="w-full h-12 text-base" disabled={joining} onClick={submit}>
            {joining ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Flame className="h-4 w-4 mr-2" />} Masuk Lobby
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ParticipantScreen({ code, participantId }) {
  const [data, setData] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [claiming, setClaiming] = useState(null);
  const [showGo, setShowGo] = useState(null);
  const dataRef = useRef(null);
  useEffect(() => { dataRef.current = data; }, [data]);

  const load = useCallback(async () => {
    const [w, p] = await Promise.all([
      api.get(`wars/code/${code}`),
      api.get(`participants/${participantId}`),
    ]);
    if (w.ok) setData(w);
    if (p.ok) setParticipant(p.participant);
  }, [code, participantId]);

  useEffect(() => {
    let stopped = false;
    let timer;
    const tick = async () => {
      if (stopped) return;
      await load();
      const status = dataRef.current?.war?.status;
      timer = setTimeout(tick, status === 'LIVE' ? 700 : 1500);
    };
    tick();
    return () => { stopped = true; clearTimeout(timer); };
  }, [load]);

  const now = useServerClock(data?.serverTime);
  const war = data?.war;
  const startMs = war ? new Date(war.startAt).getTime() : 0;
  const endMs = war ? new Date(war.endAt).getTime() : 0;
  const untilStart = startMs - now;
  const untilEnd = endMs - now;

  useEffect(() => {
    if (!war) return;
    if (war.status === 'LOBBY' && untilStart <= 3000 && untilStart > -800 && showGo === null) setShowGo(3);
  }, [war, untilStart, showGo]);

  useEffect(() => {
    if (showGo === null) return;
    if (showGo === 'GO') { const t = setTimeout(() => setShowGo(null), 800); return () => clearTimeout(t); }
    const t = setTimeout(() => setShowGo(showGo === 1 ? 'GO' : showGo - 1), 1000);
    return () => clearTimeout(t);
  }, [showGo]);

  const claim = async (room) => {
    if (participant?.roomId) return;
    setClaiming(room.id);
    const r = await api.post('claim', { participantId, roomId: room.id });
    setClaiming(null);
    if (r.ok) { setParticipant(r.participant); toast.success(`ROOM SECURED: ${room.name}`); load(); }
    else if (r.error === 'ROOM_FULL') { toast.error(`TOO LATE. ${room.name} baru saja penuh.`); load(); }
    else if (r.error === 'ALREADY_ASSIGNED') { toast.info('Kamu sudah dapat ruangan.'); load(); }
    else toast.error(r.error || 'Gagal claim');
  };

  if (!war || !participant) return <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading…</div>;

  if (showGo !== null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div key={String(showGo)} className="text-white text-[180px] font-black tick-num">{showGo}</div>
      </div>
    );
  }

  const myRoom = war.rooms.find((r) => r.id === participant.roomId);

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto max-w-md px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] tracking-[0.3em] text-primary font-bold">WAR KELAS</div>
            <div className="text-sm font-bold leading-tight">{war.name}</div>
          </div>
          <div className="flex items-center gap-2">
            {war.status === 'LIVE' && <Badge className="bg-primary animate-pulse">LIVE</Badge>}
            {war.status === 'LOBBY' && <Badge variant="secondary">LOBBY</Badge>}
            {war.status === 'COMPLETED' && <Badge variant="outline">SELESAI</Badge>}
            {war.status === 'CANCELLED' && <Badge variant="destructive">CANCELLED</Badge>}
          </div>
        </div>
        {war.status === 'LIVE' && (
          <div className="container mx-auto max-w-md px-4 pb-2 flex items-center gap-2 text-sm">
            <Timer className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground text-xs">TIME LEFT</span>
            <span className="mono font-bold text-primary">{fmt(untilEnd)}</span>
            <span className="ml-auto text-muted-foreground text-xs">{data.assignedCount}/{data.participantCount} assigned</span>
          </div>
        )}
        {war.status === 'LOBBY' && (
          <div className="container mx-auto max-w-md px-4 pb-2 flex items-center gap-2 text-sm">
            <Timer className="h-4 w-4" />
            <span className="text-muted-foreground text-xs">STARTING IN</span>
            <span className="mono font-bold">{fmt(untilStart)}</span>
            <span className="ml-auto text-muted-foreground text-xs">{data.participantCount} peserta</span>
          </div>
        )}
      </div>

      <div className="container mx-auto max-w-md px-4 py-6">
        {myRoom && (
          <Card className="mb-5 border-primary bg-primary/10">
            <CardContent className="p-5 text-center">
              <div className="text-primary text-xs tracking-[0.3em] font-bold flex items-center justify-center gap-1"><Check className="h-3 w-3" /> ROOM SECURED</div>
              <div className="text-4xl font-black mt-1">{myRoom.name}</div>
              {myRoom.code && <div className="text-sm text-muted-foreground">{myRoom.code}</div>}
              <div className="text-xs text-muted-foreground mt-2">Selection time: <span className="mono">{fmtTimeMs(participant.assignedAt)}</span></div>
            </CardContent>
          </Card>
        )}

        {war.status === 'LOBBY' && !myRoom && (
          <div className="text-center mb-5">
            <div className="text-lg font-bold">Menunggu WAR dimulai…</div>
            <p className="text-sm text-muted-foreground">Persiapkan jari cepatmu. 3-2-1-GO.</p>
          </div>
        )}
        {war.status === 'LIVE' && !myRoom && <h2 className="text-2xl font-black text-center mb-4">REBUT RUANGANMU.</h2>}
        {war.status === 'COMPLETED' && (
          <div className="text-center mb-5">
            <div className="text-2xl font-black">WAR OVER</div>
            <p className="text-sm text-muted-foreground">Room selection is closed.</p>
          </div>
        )}

        <div className="space-y-3">
          {war.rooms.map((r) => {
            const full = r.slotsLeft <= 0;
            const almost = !full && r.slotsLeft <= Math.max(1, Math.floor(r.capacity * 0.2));
            const locked = r.status === 'LOCKED';
            const isMine = myRoom?.id === r.id;
            const disabled = war.status !== 'LIVE' || full || locked || !!myRoom || !!claiming;
            return (
              <Card key={r.id} className={`transition-all ${isMine ? 'border-primary bg-primary/10' : full ? 'opacity-60' : almost ? 'border-primary/60' : ''}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black tracking-tight">{r.name}</span>
                      {r.code && <span className="text-xs text-muted-foreground font-mono">{r.code}</span>}
                    </div>
                    <div className="mt-1 text-sm mono">
                      {full ? (
                        <span className="text-muted-foreground">{r.assignedCount} / {r.capacity} · <span className="font-bold text-destructive">FULL</span></span>
                      ) : (
                        <>
                          <span className="text-muted-foreground">{r.assignedCount} / {r.capacity} </span>
                          <span className={`font-bold ${almost ? 'text-primary' : ''}`}>· {r.slotsLeft} SLOT LEFT</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isMine ? (
                      <Badge className="bg-primary text-primary-foreground">YOUR ROOM</Badge>
                    ) : full ? (
                      <Button disabled className="h-11 min-w-[110px]">FULL</Button>
                    ) : locked ? (
                      <Button disabled className="h-11 min-w-[110px]">LOCKED</Button>
                    ) : (
                      <Button onClick={() => claim(r)} disabled={disabled} className={`h-11 min-w-[110px] font-bold ${almost ? 'animate-pulse-glow' : ''}`}>
                        {claiming === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Zap className="h-4 w-4 mr-1" />REBUT</>}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {war.status === 'COMPLETED' && (
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-sm tracking-widest">FINAL ALLOCATION</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {war.rooms.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span className="font-bold">{r.name}</span>
                  <span className="mono text-muted-foreground">{r.assignedCount} / {r.capacity}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-center text-xs text-muted-foreground">
          Kamu: <span className="font-bold">{participant.name}</span> · <span className="font-mono">{participant.participantCode}</span>
        </div>
      </div>
    </div>
  );
}

export default App;
