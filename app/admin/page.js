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
import { Users, Timer, Zap, Trophy, Copy, Plus, Trash2, ChevronRight, Shield, RefreshCw, X, Loader2, Home } from 'lucide-react';
import { api, fmt, fmtTimeMs, useServerClock } from '@/lib/wk';

const AdminApp = () => {
  const [authed, setAuthed] = useState(null); // null = checking
  const [route, setRoute] = useState({ name: 'list' });

  useEffect(() => {
    setAuthed(!!localStorage.getItem('wk_admin_token'));
  }, []);

  useEffect(() => {
    const parse = () => {
      const h = window.location.hash.replace(/^#/, '');
      const parts = h.split('/').filter(Boolean);
      if (parts[0] === 'dashboard' && parts[1]) return setRoute({ name: 'dashboard', warId: parts[1] });
      setRoute({ name: 'list' });
    };
    parse();
    window.addEventListener('hashchange', parse);
    return () => window.removeEventListener('hashchange', parse);
  }, []);

  if (authed === null) return <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading…</div>;
  if (!authed) return <AdminLogin onAuthed={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen">
      {route.name === 'list' && <AdminList onLogout={() => { localStorage.removeItem('wk_admin_token'); setAuthed(false); }} />}
      {route.name === 'dashboard' && <Dashboard warId={route.warId} />}
    </div>
  );
};

function AdminLogin({ onAuthed }) {
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!pw) return;
    setLoading(true);
    const r = await api.post('admin/login', { password: pw });
    setLoading(false);
    if (r.ok) {
      localStorage.setItem('wk_admin_token', r.token);
      toast.success('Selamat datang, admin');
      onAuthed();
    } else toast.error(r.error || 'Password salah');
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_40%_at_50%_-10%,rgba(239,68,68,0.15),transparent)]" />
      <div className="container mx-auto max-w-md px-5 py-20">
        <div className="flex items-center justify-center gap-2 text-primary mb-2">
          <Shield className="h-5 w-5" />
          <span className="text-xs tracking-[0.3em] font-semibold">ADMIN CONSOLE</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-center">WAR KELAS</h1>
        <p className="mt-3 text-sm text-muted-foreground text-center">Halaman ini khusus untuk admin.</p>
        <Card className="mt-8">
          <CardContent className="p-5 space-y-4">
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && login()}
                className="h-12"
                placeholder="••••••••"
                autoFocus
              />
            </div>
            <Button className="w-full h-12" disabled={!pw || loading} onClick={login}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />} Masuk
            </Button>
          </CardContent>
        </Card>
        <div className="mt-6 text-center">
          <a href="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <Home className="h-3 w-3" /> Kembali ke halaman peserta
          </a>
        </div>
      </div>
    </div>
  );
}

function AdminList({ onLogout }) {
  const [wars, setWars] = useState([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const r = await api.get('wars');
    setLoading(false);
    if (r.ok) setWars(r.wars);
    else if (r.error === 'Unauthorized') { onLogout(); }
  }, [onLogout]);
  useEffect(() => { load(); }, [load]);

  const deleteWar = async (w) => {
    if (!confirm(`Hapus WAR "${w.name}" permanen? Semua data peserta akan hilang.`)) return;
    const r = await api.post(`wars/${w.id}/delete`);
    if (r.ok) { toast.success('WAR dihapus'); load(); }
    else toast.error(r.error || 'Gagal');
  };

  return (
    <div className="container mx-auto max-w-3xl px-5 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs tracking-[0.3em] text-primary font-semibold">ADMIN CONSOLE</div>
          <h1 className="text-3xl font-black">WAR Manager</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onLogout}>Logout</Button>
          <a href="/"><Button variant="ghost" size="icon" title="Halaman peserta"><Home className="h-4 w-4" /></Button></a>
        </div>
      </div>

      {!creating ? (
        <Button className="w-full h-12 mb-6" onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-2" /> Buat WAR Baru</Button>
      ) : (
        <CreateWarForm onDone={(w) => { setCreating(false); load(); if (w) window.location.hash = `dashboard/${w.id}`; }} onCancel={() => setCreating(false)} />
      )}

      <div className="mt-6 space-y-3">
        {loading && <p className="text-muted-foreground text-sm">Loading…</p>}
        {!loading && wars.length === 0 && <p className="text-muted-foreground text-sm">Belum ada WAR. Buat yang pertama.</p>}
        {wars.map((w) => (
          <Card key={w.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="cursor-pointer flex-1 min-w-0" onClick={() => { window.location.hash = `dashboard/${w.id}`; }}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={w.status === 'LIVE' ? 'default' : 'secondary'} className={w.status === 'LIVE' ? 'bg-primary text-primary-foreground animate-pulse' : ''}>{w.status}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">#{w.code}</span>
                </div>
                <h3 className="font-bold truncate">{w.name}</h3>
                <p className="text-xs text-muted-foreground">{w.rooms?.length || 0} ruangan · Cap total {(w.rooms || []).reduce((a, r) => a + r.capacity, 0)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteWar(w); }} title="Hapus WAR"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
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
      <CardHeader><CardTitle>Buat WAR</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div><Label>Nama WAR</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Deskripsi</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Mulai</Label><Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} /></div>
          <div><Label>Selesai</Label><Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} /></div>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <div className="font-medium text-sm">Boleh Pindah Ruangan</div>
            <div className="text-xs text-muted-foreground">Peserta dapat pindah setelah claim</div>
          </div>
          <Switch checked={allowRoomChange} onCheckedChange={setAllowRoomChange} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Ruangan</Label>
            <Button size="sm" variant="outline" onClick={() => setRooms([...rooms, { name: `ROOM ${String.fromCharCode(65 + rooms.length)}`, code: '', capacity: 10 }])}>
              <Plus className="h-3 w-3 mr-1" /> Tambah
            </Button>
          </div>
          <div className="space-y-2">
            {rooms.map((r, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input placeholder="Nama" value={r.name} onChange={(e) => setRooms(rooms.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <Input placeholder="Kode" value={r.code} className="w-24" onChange={(e) => setRooms(rooms.map((x, j) => j === i ? { ...x, code: e.target.value } : x))} />
                <Input placeholder="Cap" type="number" min={1} value={r.capacity} className="w-20" onChange={(e) => setRooms(rooms.map((x, j) => j === i ? { ...x, capacity: parseInt(e.target.value) || 1 } : x))} />
                <Button size="icon" variant="ghost" onClick={() => setRooms(rooms.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={submit} disabled={saving} className="flex-1">{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Buat WAR</Button>
          <Button variant="outline" onClick={onCancel}>Batal</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard({ warId }) {
  const [data, setData] = useState(null);
  const load = useCallback(async () => {
    const r = await api.get(`wars/${warId}/full`);
    if (r.ok) setData(r);
    else if (r.error === 'Unauthorized') {
      localStorage.removeItem('wk_admin_token');
      window.location.hash = '';
      window.location.reload();
    }
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
  const [addNisn, setAddNisn] = useState('');
  const [bulk, setBulk] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const fileRef = useRef(null);

  const start = async () => { await api.post(`wars/${warId}/start`); toast.success('WAR dimulai'); load(); };
  const endWar = async () => { await api.post(`wars/${warId}/end`); toast.success('WAR diakhiri'); load(); };
  const reset = async () => { if (confirm('Reset semua assignment?')) { await api.post(`wars/${warId}/reset`); toast.success('Reset'); load(); } };
  const cancel = async () => { if (confirm('Batalkan WAR?')) { await api.post(`wars/${warId}/cancel`); load(); } };
  const deleteWar = async () => {
    if (!confirm('Hapus WAR ini permanen? Semua data peserta akan hilang.')) return;
    const r = await api.post(`wars/${warId}/delete`);
    if (r.ok) { toast.success('WAR dihapus'); window.location.hash = ''; }
  };

  const addParticipant = async () => {
    if (!addName.trim() || !addNisn.trim()) return toast.error('Nama & NISN wajib');
    const r = await api.post(`wars/${warId}/participants`, { name: addName.trim(), participantCode: addNisn.trim() });
    if (r.ok) { toast.success('Siswa ditambah'); setAddName(''); setAddNisn(''); load(); }
  };

  const parseCsv = (text) => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];
    const first = lines[0].toLowerCase();
    const hasHeader = /nisn|nama|name/i.test(first);
    const rows = hasHeader ? lines.slice(1) : lines;
    let nisnIdx = 0, nameIdx = 1;
    if (hasHeader) {
      const cols = first.split(/[,;\t|]/).map((x) => x.trim());
      const ni = cols.findIndex((c) => /nisn|nis|code|id/i.test(c));
      const na = cols.findIndex((c) => /nama|name/i.test(c));
      if (ni >= 0) nisnIdx = ni;
      if (na >= 0) nameIdx = na;
    }
    return rows.map((l) => {
      const cols = l.split(/[,;\t|]/).map((x) => x.trim().replace(/^"|"$/g, ''));
      const nisn = cols[nisnIdx] || '';
      const name = cols[nameIdx] || cols.filter((_, i) => i !== nisnIdx).join(' ');
      return { participantCode: nisn, name };
    }).filter((r) => r.name && r.participantCode);
  };

  const importParticipants = async (list) => {
    if (list.length === 0) return toast.error('Tidak ada data valid');
    const r = await api.post(`wars/${warId}/participants`, { participants: list });
    if (r.ok) {
      toast.success(`Imported ${r.inserted.length}${r.skipped?.length ? ` · Skip ${r.skipped.length}` : ''}`);
      setBulk(''); setShowBulk(false); load();
    } else toast.error(r.error || 'Gagal');
  };
  const importBulkText = async () => importParticipants(parseCsv(bulk));
  const importFile = async (file) => { if (!file) return; const text = await file.text(); importParticipants(parseCsv(text)); };

  const unassign = async (pid) => { await api.post(`wars/${warId}/unassign`, { participantId: pid }); load(); };
  const removeParticipant = async (pid) => {
    if (!confirm('Hapus siswa ini?')) return;
    await api.post(`wars/${warId}/participants/${pid}/remove`);
    load();
  };

  const exportCsv = () => {
    const rows = [['NISN', 'Nama', 'Ruangan', 'Waktu']];
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
  const copyJoin = () => { navigator.clipboard.writeText(joinUrl); toast.success('Link tersalin'); };

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
        <Button variant="ghost" onClick={() => { window.location.hash = ''; }} title="Kembali ke daftar"><X className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="STATUS" value={war.status} />
        <Stat label={war.status === 'LIVE' ? 'TIME LEFT' : 'TOTAL CAP'} value={war.status === 'LIVE' ? fmt(untilEnd) : String(totalCap)} accent />
        <Stat label="PARTICIPANTS" value={`${participants.length}`} />
        <Stat label="ASSIGNED" value={`${assigned} / ${totalCap}`} />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {war.status !== 'LIVE' && war.status !== 'COMPLETED' && war.status !== 'CANCELLED' && (
          <Button onClick={start}><Zap className="h-4 w-4 mr-1" />Mulai WAR Sekarang</Button>
        )}
        {war.status === 'LIVE' && <Button variant="destructive" onClick={endWar}>Akhiri WAR</Button>}
        <Button variant="outline" onClick={reset}><RefreshCw className="h-4 w-4 mr-1" />Reset</Button>
        <Button variant="outline" onClick={exportCsv}><Trophy className="h-4 w-4 mr-1" />Export CSV</Button>
        {war.status !== 'CANCELLED' && war.status !== 'COMPLETED' && <Button variant="ghost" onClick={cancel}>Batalkan</Button>}
        <Button variant="destructive" onClick={deleteWar} className="ml-auto"><Trash2 className="h-4 w-4 mr-1" />Hapus WAR</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm tracking-widest">STATUS RUANGAN</CardTitle></CardHeader>
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
          <CardHeader><CardTitle className="text-sm tracking-widest">AKTIVITAS LIVE</CardTitle></CardHeader>
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
        <CardHeader>
          <CardTitle className="text-sm tracking-widest flex items-center gap-2">
            SISWA ({participants.length})
            <span className="ml-auto text-xs font-normal text-muted-foreground">Kolom: NISN, Nama</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-3">
            <Input placeholder="NISN" value={addNisn} onChange={(e) => setAddNisn(e.target.value)} className="max-w-[160px] font-mono" />
            <Input placeholder="Nama" value={addName} onChange={(e) => setAddName(e.target.value)} className="max-w-[220px]" />
            <Button onClick={addParticipant}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
            <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>Upload CSV</Button>
            <Button variant="outline" onClick={() => setShowBulk(!showBulk)}>Paste List</Button>
          </div>
          {showBulk && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-1">Format per baris: <span className="font-mono">NISN, Nama</span> (koma / tab / semicolon). Header opsional.</p>
              <Textarea rows={5} placeholder={"NISN,Nama\n0012345678, Jonathan\n0012345679, Michael"} value={bulk} onChange={(e) => setBulk(e.target.value)} className="font-mono text-sm" />
              <Button size="sm" className="mt-2" onClick={importBulkText}>Import {parseCsv(bulk).length} baris</Button>
            </div>
          )}
          <div className="max-h-96 overflow-y-auto divide-y">
            {participants.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Belum ada siswa. Upload CSV atau tambah manual.</p>}
            {participants.map((p) => {
              const rr = war.rooms.find((x) => x.id === p.roomId);
              return (
                <div key={p.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="mono text-xs text-muted-foreground w-24 truncate">{p.participantCode}</span>
                  <span className="flex-1 truncate">{p.name}</span>
                  {rr ? (
                    <>
                      <Badge className="bg-primary">{rr.name}</Badge>
                      <span className="mono text-xs text-muted-foreground hidden md:inline">{fmtTimeMs(p.assignedAt).slice(0, 12)}</span>
                      <Button size="sm" variant="ghost" onClick={() => unassign(p.id)} title="Reset assignment"><RefreshCw className="h-3 w-3" /></Button>
                    </>
                  ) : (
                    <Badge variant="outline">Belum</Badge>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => removeParticipant(p.id)} title="Hapus siswa"><Trash2 className="h-3 w-3 text-destructive" /></Button>
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
            <div className="text-xs text-muted-foreground">Share link ke siswa</div>
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

export default AdminApp;
