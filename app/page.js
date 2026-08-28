'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Swords, Users, Timer, Zap, Trophy, Copy, Plus, Trash2, ChevronRight, LogIn, Shield, RefreshCw, X, Check, Loader2, Flame } from 'lucide-react';

const api = {
  async get(path) { const r = await fetch(`/api/${path}`, { cache: 'no-store' }); return r.json(); },
  async post(path, body) {
    const r = await fetch(`/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    return r.json();
  },
};

function fmt(ms) {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function fmtTimeMs(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}
function useServerClock(serverTime) {
  const [now, setNow] = useState(Date.now());
  const offsetRef = useRef(0);
  useEffect(() => { if (serverTime) offsetRef.current = serverTime - Date.now(); }, [serverTime]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offsetRef.current), 100);
    return () => clearInterval(t);
  }, []);
  return now;
}

const App = () => {
  const [route, setRoute] = useState({ name: 'home' });
  useEffect(() => {
    const parse = () => {
      const h = window.location.hash.replace(/^#/, '');
      const parts = h.split('/').filter(Boolean);
      if (parts[0] === 'join' && parts[1]) return setRoute({ name: 'join', code: parts[1].toUpperCase() });
      if (parts[0] === 'admin') return setRoute({ name: 'admin' });
      if (parts[0] === 'dashboard' && parts[1]) return setRoute({ name: 'dashboard', warId: parts[1] });
      if (parts[0] === 'war' && parts[1]) {
        const code = parts[1].toUpperCase();
        const pid = localStorage.getItem(`wk_pid_${code}`);
        if (pid) return setRoute({ name: 'participant', code, participantId: pid });
        return setRoute({ name: 'join', code });
      }
      setRoute({ name: 'home' });
    };
    parse();
    window.addEventListener('hashchange', parse);
    return () => window.removeEventListener('hashchange', parse);
  }, []);

  return (
    <div className="min-h-screen">
      {route.name === 'home' && <HomeScreen />}
      {route.name === 'admin' && <AdminScreen />}
      {route.name === 'join' && (
        <JoinScreen code={route.code} onJoined={(warCode, pid) => {
          localStorage.setItem(`wk_pid_${warCode}`, pid);
          window.location.hash = `war/${warCode}`;
        }} />
      )}
      {route.name === 'participant' && <ParticipantScreen code={route.code} participantId={route.participantId} />}
      {route.name === 'dashboard' && <DashboardScreen warId={route.warId} />}
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
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Join sebagai Peserta</Label>
            <div className="flex gap-2">
              <Input placeholder="WAR CODE" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="uppercase font-mono tracking-widest text-lg h-12" maxLength={8} />
              <Button className="h-12 px-5" disabled={!code} onClick={() => { window.location.hash = `join/${code}`; }}>
                <LogIn className="h-4 w-4 mr-1" /> Join
              </Button>
            </div>
          </CardContent>
        </Card>
        <Separator className="my-8" />
        <Button variant="outline" className="w-full h-12" onClick={() => { window.location.hash = 'admin'; }}>
          <Shield className="h-4 w-4 mr-2" /> Admin Panel
        </Button>
        <p className="text-xs text-muted-foreground mt-8 text-center">Real-time · Atomic · Server-authoritative</p>
      </div>
    </div>
  );
}

function AdminScreen() {
  const [wars, setWars] = useState([]);
  const [creating, setCreating] = useState(false);
  const load = useCallback(async () => {
    const r = await api.get('wars');
    if (r.ok) setWars(r.wars);
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="container mx-auto max-w-3xl px-5 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs tracking-[0.3em] text-primary font-semibold">ADMIN</div>
          <h1 className="text-3xl font-black">WAR Manager</h1>
        </div>
        <Button variant="ghost" onClick={() => { window.location.hash = ''; }}><X className="h-4 w-4" /></Button>
      </div>
      {!creating ? (
        <Button className="w-full h-12 mb-6" onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-2" /> Create New WAR</Button>
      ) : (
        <CreateWarForm onDone={(w) => { setCreating(false); load(); if (w) window.location.hash = `dashboard/${w.id}`; }} onCancel={() => setCreating(false)} />
      )}
      <div className="mt-6 space-y-3">
        {wars.length === 0 && <p className="text-muted-foreground text-sm">Belum ada WAR.</p>}
        {wars.map((w) => (
          <Card key={w.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => { window.location.hash = `dashboard/${w.id}`; }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={w.status === 'LIVE' ? 'default' : 'secondary'} className={w.status === 'LIVE' ? 'bg-primary text-primary-foreground animate-pulse' : ''}>{w.status}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">#{w.code}</span>
                </div>
                <h3 className="font-bold">{w.name}</h3>
                <p className="text-xs text-muted-foreground">{w.rooms?.length || 0} ruangan · Cap total {(w.rooms || []).reduce((a, r) => a + r.capacity, 0)}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CreateWarForm({ onDone, onCancel }) {
  const [name, setName] = useState('Pembagian Kelas Semester 1');
  const [description, setDescription] = useState('');
  const now = new Date();
  const tzOffsetMs = now.getTimezoneOffset() * 60000;
  const toLocalInput = (d) => new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
  const [startAt, setStartAt] = useState(toLocalInput(new Date(now.getTime() + 2 * 60 * 1000)));
  const [endAt, setEndAt] = useState(toLocalInput(new Date(now.getTime() + 12 * 60 * 1000)));
  const [rooms, setRooms] = useState([
    { name: 'ROOM A', code: 'A-101', capacity: 10 },
    { name: 'ROOM B', code: 'B-102', capacity: 10 },
    { name: 'ROOM C', code: 'C-103', capacity: 10 },
    { name: 'ROOM D', code: 'D-104', capacity: 10 },
  ]);
  const [allowRoomChange, setAllowRoomChange] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name || rooms.length === 0) return toast.error('Nama & ruangan wajib');
    setSaving(true);
    const r = await api.post('wars', {
      name, description,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      rooms, allowRoomChange,
    });
    setSaving(false);
    if (r.ok) { toast.success(`WAR dibuat: ${r.war.code}`); onDone(r.war); }
    else toast.error(r.error || 'Gagal');
  };

  return (
    <Card>
      <CardHeader><CardTitle>Create WAR</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div><Label>WAR Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Start</Label><Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} /></div>
          <div><Label>End</Label><Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} /></div>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <div className="font-medium text-sm">Allow Room Change</div>
            <div className="text-xs text-muted-foreground">Peserta dapat pindah ruangan setelah claim</div>
          </div>
          <Switch checked={allowRoomChange} onCheckedChange={setAllowRoomChange} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Rooms</Label>
            <Button size="sm" variant="outline" onClick={() => setRooms([...rooms, { name: `ROOM ${String.fromCharCode(65 + rooms.length)}`, code: '', capacity: 10 }])}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          <div className="space-y-2">
            {rooms.map((r, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input placeholder="Name" value={r.name} onChange={(e) => setRooms(rooms.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <Input placeholder="Code" value={r.code} className="w-24" onChange={(e) => setRooms(rooms.map((x, j) => j === i ? { ...x, code: e.target.value } : x))} />
                <Input placeholder="Cap" type="number" min={1} value={r.capacity} className="w-20" onChange={(e) => setRooms(rooms.map((x, j) => j === i ? { ...x, capacity: parseInt(e.target.value) || 1 } : x))} />
                <Button size="icon" variant="ghost" onClick={() => setRooms(rooms.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={submit} disabled={saving} className="flex-1">{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create WAR</Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function JoinScreen({ code, onJoined }) {
  const [name, setName] = useState('');
  const [participantCode, setParticipantCode] = useState('');
  const [war, setWar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await api.get(`wars/code/${code}`);
      setLoading(false);
      if (r.ok) setWar(r.war);
      else toast.error(r.error || 'WAR not found');
    })();
  }, [code]);

  const submit = async () => {
    if (!name.trim()) return toast.error('Nama wajib');
    setJoining(true);
    const r = await api.post('join', { code, name: name.trim(), participantCode: participantCode.trim() || undefined });
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
          <div><Label>Nama Lengkap</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="h-12" placeholder="Jonathan" /></div>
          <div><Label>NIM / Participant ID <span className="text-muted-foreground text-xs">(opsional)</span></Label>
            <Input value={participantCode} onChange={(e) => setParticipantCode(e.target.value)} className="h-12 font-mono" placeholder="001" /></div>
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

function DashboardScreen({ warId }) {
  const [data, setData] = useState(null);
  const load = useCallback(async () => {
    const r = await api.get(`wars/${warId}/full`);
    if (r.ok) setData(r);
  }, [warId]);
  useEffect(() => {
    load();
    const t = setInterval(load, 900);
    return () => clearInterval(t);
  }, [load]);

  const now = useServerClock(data?.serverTime);
  const war = data?.war;
  const participants = data?.participants || [];
  const activity = data?.activity || [];
  const untilEnd = war ? new Date(war.endAt).getTime() - now : 0;
  const totalCap = war ? war.rooms.reduce((a, r) => a + r.capacity, 0) : 0;
  const assigned = participants.filter((p) => p.roomId).length;

  const [addName, setAddName] = useState('');
  const [addCode, setAddCode] = useState('');
  const [bulk, setBulk] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  const start = async () => { await api.post(`wars/${warId}/start`); toast.success('WAR started'); load(); };
  const endWar = async () => { await api.post(`wars/${warId}/end`); toast.success('WAR ended'); load(); };
  const reset = async () => { if (confirm('Reset semua assignment?')) { await api.post(`wars/${warId}/reset`); toast.success('Reset'); load(); } };
  const cancel = async () => { if (confirm('Batalkan WAR?')) { await api.post(`wars/${warId}/cancel`); load(); } };

  const addParticipant = async () => {
    if (!addName.trim()) return;
    const r = await api.post(`wars/${warId}/participants`, { name: addName.trim(), participantCode: addCode.trim() });
    if (r.ok) { toast.success('Added'); setAddName(''); setAddCode(''); load(); }
  };
  const importBulk = async () => {
    const lines = bulk.split('\n').map((l) => l.trim()).filter(Boolean);
    const list = lines.map((l) => {
      const parts = l.split(/[,;\t|]/).map((x) => x.trim());
      if (parts.length >= 2) return { participantCode: parts[0], name: parts.slice(1).join(' ') };
      return { name: parts[0] };
    });
    const r = await api.post(`wars/${warId}/participants`, { participants: list });
    if (r.ok) { toast.success(`Imported ${r.inserted.length}`); setBulk(''); setShowBulk(false); load(); }
  };
  const unassign = async (pid) => { await api.post(`wars/${warId}/unassign`, { participantId: pid }); load(); };

  const exportCsv = () => {
    const rows = [['ParticipantID', 'Name', 'Room', 'AssignedAt']];
    participants.forEach((p) => {
      const rr = war.rooms.find((x) => x.id === p.roomId);
      rows.push([p.participantCode, p.name, rr?.name || '', p.assignedAt || '']);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `war-${war.code}-result.csv`; a.click();
  };

  const joinUrl = typeof window !== 'undefined' && war ? `${window.location.origin}/#join/${war.code}` : '';
  const copyJoin = () => { navigator.clipboard.writeText(joinUrl); toast.success('Link copied'); };

  if (!war) return <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading…</div>;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs tracking-[0.3em] text-primary font-bold">ADMIN DASHBOARD</div>
          <h1 className="text-2xl md:text-3xl font-black">{war.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={war.status === 'LIVE' ? 'bg-primary animate-pulse' : ''}>{war.status}</Badge>
            <button onClick={copyJoin} className="text-xs font-mono text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <Copy className="h-3 w-3" />#{war.code}
            </button>
          </div>
        </div>
        <Button variant="ghost" onClick={() => { window.location.hash = 'admin'; }}><X className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="STATUS" value={war.status} />
        <Stat label={war.status === 'LIVE' ? 'TIME LEFT' : 'TOTAL CAP'} value={war.status === 'LIVE' ? fmt(untilEnd) : String(totalCap)} accent />
        <Stat label="PARTICIPANTS" value={`${participants.length}`} />
        <Stat label="ASSIGNED" value={`${assigned} / ${totalCap}`} />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {war.status !== 'LIVE' && war.status !== 'COMPLETED' && war.status !== 'CANCELLED' && (
          <Button onClick={start}><Zap className="h-4 w-4 mr-1" />Start WAR Now</Button>
        )}
        {war.status === 'LIVE' && <Button variant="destructive" onClick={endWar}>End WAR</Button>}
        <Button variant="outline" onClick={reset}><RefreshCw className="h-4 w-4 mr-1" />Reset</Button>
        <Button variant="outline" onClick={exportCsv}><Trophy className="h-4 w-4 mr-1" />Export CSV</Button>
        {war.status !== 'CANCELLED' && war.status !== 'COMPLETED' && <Button variant="ghost" onClick={cancel}>Cancel</Button>}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm tracking-widest">ROOM STATUS</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {war.rooms.map((r) => {
              const pct = (r.assignedCount / r.capacity) * 100;
              return (
                <div key={r.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold">{r.name} <span className="text-xs text-muted-foreground font-mono">{r.code}</span></span>
                    <span className="mono">{r.assignedCount}/{r.capacity} {r.slotsLeft === 0 && <span className="text-destructive font-bold">FULL</span>}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${r.slotsLeft === 0 ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm tracking-widest">LIVE ACTIVITY</CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-72 overflow-y-auto text-sm divide-y">
              {activity.length === 0 && <p className="text-muted-foreground text-sm">Belum ada aktivitas.</p>}
              {activity.map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-2">
                  <span className="mono text-xs text-muted-foreground">{fmtTimeMs(a.createdAt).slice(0, 12)}</span>
                  <span className="font-medium truncate">{a.participantName}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-bold text-primary">{a.roomName}</span>
                  {a.action !== 'CLAIM' && <Badge variant="outline" className="ml-auto text-[10px]">{a.action}</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle className="text-sm tracking-widest">PARTICIPANTS ({participants.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-3">
            <Input placeholder="Name" value={addName} onChange={(e) => setAddName(e.target.value)} className="max-w-[200px]" />
            <Input placeholder="Code" value={addCode} onChange={(e) => setAddCode(e.target.value)} className="max-w-[140px] font-mono" />
            <Button onClick={addParticipant}><Plus className="h-4 w-4 mr-1" />Add</Button>
            <Button variant="outline" onClick={() => setShowBulk(!showBulk)}>Import Bulk</Button>
          </div>
          {showBulk && (
            <div className="mb-3">
              <Textarea rows={5} placeholder={"001, Jonathan\n002, Michael\nSarah"} value={bulk} onChange={(e) => setBulk(e.target.value)} className="font-mono text-sm" />
              <Button size="sm" className="mt-2" onClick={importBulk}>Import</Button>
            </div>
          )}
          <div className="max-h-96 overflow-y-auto divide-y">
            {participants.map((p) => {
              const rr = war.rooms.find((x) => x.id === p.roomId);
              return (
                <div key={p.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="mono text-xs text-muted-foreground w-16 truncate">{p.participantCode}</span>
                  <span className="flex-1 truncate">{p.name}</span>
                  {rr ? (
                    <>
                      <Badge className="bg-primary">{rr.name}</Badge>
                      <span className="mono text-xs text-muted-foreground hidden md:inline">{fmtTimeMs(p.assignedAt).slice(0, 12)}</span>
                      <Button size="sm" variant="ghost" onClick={() => unassign(p.id)}><X className="h-3 w-3" /></Button>
                    </>
                  ) : (
                    <Badge variant="outline">Unassigned</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <Users className="h-5 w-5 text-primary" />
          <div className="text-sm">
            <div className="text-xs text-muted-foreground">Share this link to participants</div>
            <div className="font-mono text-sm break-all">{joinUrl}</div>
          </div>
          <Button size="sm" variant="outline" onClick={copyJoin} className="ml-auto"><Copy className="h-4 w-4 mr-1" />Copy</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[10px] tracking-[0.3em] text-muted-foreground font-bold">{label}</div>
        <div className={`text-xl md:text-2xl font-black mono ${accent ? 'text-primary' : ''}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

export default App;
