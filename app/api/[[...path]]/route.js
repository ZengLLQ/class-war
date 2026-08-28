import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb, ensureIndexes } from '@/lib/mongo';

export const dynamic = 'force-dynamic';

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}
function err(message, status = 400, extra = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}
function genCode(len = 5) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function computeStatus(war, now = Date.now()) {
  if (['COMPLETED', 'CANCELLED', 'DRAFT'].includes(war.status)) return war.status;
  const start = war.startAt ? new Date(war.startAt).getTime() : null;
  const end = war.endAt ? new Date(war.endAt).getTime() : null;
  if (war.status === 'LIVE' && end && now >= end) return 'COMPLETED';
  if (war.status === 'LOBBY' && start && now >= start) return 'LIVE';
  return war.status;
}

async function refreshWarStatus(db, war) {
  const now = Date.now();
  const next = computeStatus(war, now);
  if (next !== war.status) {
    await db.collection('wars').updateOne({ id: war.id }, { $set: { status: next } });
    war.status = next;
  }
  return war;
}

async function getRoute(path, request) {
  const db = await getDb();
  await ensureIndexes();

  if (path === 'health') return json({ ok: true, now: Date.now() });

  // GET /api/wars — list wars (admin)
  if (path === 'wars') {
    const wars = await db.collection('wars').find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    return json({ ok: true, wars });
  }

  // GET /api/wars/:code — public war state by code
  const codeMatch = path.match(/^wars\/code\/([A-Z0-9]+)$/i);
  if (codeMatch) {
    const code = codeMatch[1].toUpperCase();
    const war = await db.collection('wars').findOne({ code }, { projection: { _id: 0 } });
    if (!war) return err('WAR not found', 404);
    await refreshWarStatus(db, war);
    const [participantCount, assignedCount] = await Promise.all([
      db.collection('participants').countDocuments({ warId: war.id }),
      db.collection('participants').countDocuments({ warId: war.id, roomId: { $ne: null } }),
    ]);
    return json({ ok: true, war, participantCount, assignedCount, serverTime: Date.now() });
  }

  // GET /api/wars/:id/full — admin full state
  const fullMatch = path.match(/^wars\/([^/]+)\/full$/);
  if (fullMatch) {
    const war = await db.collection('wars').findOne({ id: fullMatch[1] }, { projection: { _id: 0 } });
    if (!war) return err('WAR not found', 404);
    await refreshWarStatus(db, war);
    const participants = await db.collection('participants').find({ warId: war.id }, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray();
    const activity = await db.collection('activity_logs').find({ warId: war.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(50).toArray();
    return json({ ok: true, war, participants, activity, serverTime: Date.now() });
  }

  // GET /api/participants/:id — participant state (self)
  const pMatch = path.match(/^participants\/([^/]+)$/);
  if (pMatch) {
    const p = await db.collection('participants').findOne({ id: pMatch[1] }, { projection: { _id: 0 } });
    if (!p) return err('Participant not found', 404);
    return json({ ok: true, participant: p });
  }

  return err('Not found', 404);
}

async function postRoute(path, request) {
  const db = await getDb();
  await ensureIndexes();
  const body = await request.json().catch(() => ({}));

  // POST /api/wars — create war
  if (path === 'wars') {
    const { name, description = '', startAt, endAt, rooms = [], allowRoomChange = false } = body;
    if (!name || !startAt || !endAt) return err('name, startAt, endAt required');
    if (!Array.isArray(rooms) || rooms.length === 0) return err('At least one room required');

    // generate unique code
    let code;
    for (let i = 0; i < 8; i++) {
      code = genCode(5);
      const exists = await db.collection('wars').findOne({ code });
      if (!exists) break;
    }

    const id = uuidv4();
    const roomsData = rooms.map((r) => {
      const cap = Math.max(1, parseInt(r.capacity) || 1);
      return {
        id: uuidv4(),
        name: r.name || 'Room',
        code: r.code || '',
        capacity: cap,
        slotsLeft: cap,
        assignedCount: 0,
        floor: r.floor || '',
        building: r.building || '',
        description: r.description || '',
        status: 'ACTIVE',
      };
    });

    const war = {
      id,
      code,
      name,
      description,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      status: 'LOBBY',
      allowRoomChange: !!allowRoomChange,
      rooms: roomsData,
      createdAt: new Date().toISOString(),
    };
    await db.collection('wars').insertOne(war);
    return json({ ok: true, war: { ...war, _id: undefined } });
  }

  // POST /api/wars/:id/start — force start now
  const startMatch = path.match(/^wars\/([^/]+)\/start$/);
  if (startMatch) {
    const war = await db.collection('wars').findOne({ id: startMatch[1] });
    if (!war) return err('WAR not found', 404);
    const now = new Date();
    const durationMs = new Date(war.endAt).getTime() - new Date(war.startAt).getTime();
    const endAt = new Date(now.getTime() + Math.max(durationMs, 60_000)).toISOString();
    await db.collection('wars').updateOne({ id: war.id }, { $set: { status: 'LIVE', startAt: now.toISOString(), endAt } });
    return json({ ok: true });
  }

  // POST /api/wars/:id/end — end war
  const endMatch = path.match(/^wars\/([^/]+)\/end$/);
  if (endMatch) {
    await db.collection('wars').updateOne({ id: endMatch[1] }, { $set: { status: 'COMPLETED', endAt: new Date().toISOString() } });
    return json({ ok: true });
  }

  // POST /api/wars/:id/cancel
  const cancelMatch = path.match(/^wars\/([^/]+)\/cancel$/);
  if (cancelMatch) {
    await db.collection('wars').updateOne({ id: cancelMatch[1] }, { $set: { status: 'CANCELLED' } });
    return json({ ok: true });
  }

  // POST /api/wars/:id/reset — reset all assignments (dev tool)
  const resetMatch = path.match(/^wars\/([^/]+)\/reset$/);
  if (resetMatch) {
    const war = await db.collection('wars').findOne({ id: resetMatch[1] });
    if (!war) return err('WAR not found', 404);
    const rooms = war.rooms.map((r) => ({ ...r, slotsLeft: r.capacity, assignedCount: 0 }));
    await db.collection('wars').updateOne({ id: war.id }, { $set: { rooms, status: 'LOBBY' } });
    await db.collection('participants').updateMany({ warId: war.id }, { $set: { roomId: null, assignedAt: null } });
    await db.collection('activity_logs').deleteMany({ warId: war.id });
    return json({ ok: true });
  }

  // POST /api/join — join war by code as participant
  if (path === 'join') {
    const { code, name, participantCode } = body;
    if (!code || !name) return err('code and name required');
    const war = await db.collection('wars').findOne({ code: code.toUpperCase() });
    if (!war) return err('WAR not found', 404);
    if (['COMPLETED', 'CANCELLED'].includes(war.status)) return err('WAR is closed', 400);

    const pcode = (participantCode && String(participantCode).trim()) || String(name).slice(0, 20).toUpperCase();

    // Upsert-ish: if participant with same code exists in war, return it (re-join)
    let participant = await db.collection('participants').findOne({ warId: war.id, participantCode: pcode });
    if (!participant) {
      participant = {
        id: uuidv4(),
        warId: war.id,
        participantCode: pcode,
        name: String(name).trim(),
        roomId: null,
        assignedAt: null,
        createdAt: new Date().toISOString(),
      };
      try {
        await db.collection('participants').insertOne(participant);
      } catch (e) {
        // race on unique index — refetch
        participant = await db.collection('participants').findOne({ warId: war.id, participantCode: pcode });
      }
    }
    return json({ ok: true, participant: { ...participant, _id: undefined }, warId: war.id, warCode: war.code });
  }

  // POST /api/claim — the CRITICAL atomic room claim
  if (path === 'claim') {
    const { participantId, roomId } = body;
    if (!participantId || !roomId) return err('participantId and roomId required');

    const participant = await db.collection('participants').findOne({ id: participantId });
    if (!participant) return err('Participant not found', 404);
    if (participant.roomId) {
      return err('ALREADY_ASSIGNED', 409, { participant: { ...participant, _id: undefined } });
    }

    const war = await db.collection('wars').findOne({ id: participant.warId });
    if (!war) return err('WAR not found', 404);
    await refreshWarStatus(db, war);
    if (war.status !== 'LIVE') return err('WAR is not LIVE', 400);

    // ATOMIC STEP 1: decrement room slot only if slotsLeft > 0 and not locked
    const decRes = await db.collection('wars').findOneAndUpdate(
      {
        id: war.id,
        status: 'LIVE',
        rooms: { $elemMatch: { id: roomId, slotsLeft: { $gt: 0 }, status: 'ACTIVE' } },
      },
      { $inc: { 'rooms.$.slotsLeft': -1, 'rooms.$.assignedCount': 1 } },
      { returnDocument: 'after' }
    );
    const decDoc = decRes && (decRes.value || decRes); // driver compat
    if (!decDoc || !decDoc.rooms) {
      return err('ROOM_FULL', 409);
    }

    // ATOMIC STEP 2: assign participant only if still unassigned
    const assignedAt = new Date().toISOString();
    const pRes = await db.collection('participants').findOneAndUpdate(
      { id: participantId, roomId: null },
      { $set: { roomId, assignedAt } },
      { returnDocument: 'after' }
    );
    const pDoc = pRes && (pRes.value || pRes);
    if (!pDoc || !pDoc.roomId) {
      // rollback slot decrement
      await db.collection('wars').updateOne(
        { id: war.id, 'rooms.id': roomId },
        { $inc: { 'rooms.$.slotsLeft': 1, 'rooms.$.assignedCount': -1 } }
      );
      return err('ALREADY_ASSIGNED', 409);
    }

    const room = decDoc.rooms.find((r) => r.id === roomId);
    await db.collection('activity_logs').insertOne({
      id: uuidv4(),
      warId: war.id,
      participantId,
      participantName: participant.name,
      roomId,
      roomName: room?.name || '',
      action: 'CLAIM',
      createdAt: assignedAt,
    });

    // Auto-complete if all slots filled
    const totalCap = decDoc.rooms.reduce((a, r) => a + r.capacity, 0);
    const totalAssigned = decDoc.rooms.reduce((a, r) => a + r.assignedCount, 0);
    if (totalAssigned >= totalCap) {
      await db.collection('wars').updateOne({ id: war.id }, { $set: { status: 'COMPLETED' } });
    }

    return json({
      ok: true,
      participant: { ...pDoc, _id: undefined },
      room: { id: room.id, name: room.name, slotsLeft: room.slotsLeft, capacity: room.capacity, assignedCount: room.assignedCount },
      assignedAt,
    });
  }

  // POST /api/wars/:id/participants — add participant manually (admin)
  const addPMatch = path.match(/^wars\/([^/]+)\/participants$/);
  if (addPMatch) {
    const warId = addPMatch[1];
    const war = await db.collection('wars').findOne({ id: warId });
    if (!war) return err('WAR not found', 404);
    const list = Array.isArray(body.participants) ? body.participants : [body];
    const inserted = [];
    for (const item of list) {
      const name = String(item.name || '').trim();
      if (!name) continue;
      const pcode = String(item.participantCode || name).slice(0, 24).toUpperCase();
      const exists = await db.collection('participants').findOne({ warId, participantCode: pcode });
      if (exists) continue;
      const p = {
        id: uuidv4(), warId, participantCode: pcode, name,
        roomId: null, assignedAt: null, createdAt: new Date().toISOString(),
      };
      await db.collection('participants').insertOne(p);
      inserted.push({ ...p, _id: undefined });
    }
    return json({ ok: true, inserted });
  }

  // POST /api/wars/:warId/assign — admin manual assign
  const assignMatch = path.match(/^wars\/([^/]+)\/assign$/);
  if (assignMatch) {
    const warId = assignMatch[1];
    const { participantId, roomId } = body;
    // reuse claim logic but allow regardless of status
    const war = await db.collection('wars').findOne({ id: warId });
    if (!war) return err('WAR not found', 404);
    const participant = await db.collection('participants').findOne({ id: participantId });
    if (!participant || participant.warId !== warId) return err('Participant not found', 404);
    if (participant.roomId) return err('Participant already has a room', 409);
    const decRes = await db.collection('wars').findOneAndUpdate(
      { id: warId, rooms: { $elemMatch: { id: roomId, slotsLeft: { $gt: 0 } } } },
      { $inc: { 'rooms.$.slotsLeft': -1, 'rooms.$.assignedCount': 1 } },
      { returnDocument: 'after' }
    );
    const decDoc = decRes && (decRes.value || decRes);
    if (!decDoc) return err('Room full', 409);
    const assignedAt = new Date().toISOString();
    await db.collection('participants').updateOne({ id: participantId }, { $set: { roomId, assignedAt } });
    const room = decDoc.rooms.find((r) => r.id === roomId);
    await db.collection('activity_logs').insertOne({
      id: uuidv4(), warId, participantId, participantName: participant.name,
      roomId, roomName: room?.name || '', action: 'ADMIN_ASSIGN', createdAt: assignedAt,
    });
    return json({ ok: true });
  }

  // POST /api/wars/:warId/unassign — admin reset a participant's assignment
  const unassignMatch = path.match(/^wars\/([^/]+)\/unassign$/);
  if (unassignMatch) {
    const warId = unassignMatch[1];
    const { participantId } = body;
    const p = await db.collection('participants').findOne({ id: participantId });
    if (!p || !p.roomId) return err('Participant has no assignment', 400);
    const roomId = p.roomId;
    await db.collection('participants').updateOne({ id: participantId }, { $set: { roomId: null, assignedAt: null } });
    await db.collection('wars').updateOne(
      { id: warId, 'rooms.id': roomId },
      { $inc: { 'rooms.$.slotsLeft': 1, 'rooms.$.assignedCount': -1 } }
    );
    await db.collection('activity_logs').insertOne({
      id: uuidv4(), warId, participantId, participantName: p.name,
      roomId, roomName: '', action: 'ADMIN_UNASSIGN', createdAt: new Date().toISOString(),
    });
    return json({ ok: true });
  }

  return err('Not found', 404);
}

export async function GET(request, { params }) {
  const path = ((await params).path || []).join('/');
  try { return await getRoute(path, request); }
  catch (e) { console.error(e); return err(e.message || 'Server error', 500); }
}
export async function POST(request, { params }) {
  const path = ((await params).path || []).join('/');
  try { return await postRoute(path, request); }
  catch (e) { console.error(e); return err(e.message || 'Server error', 500); }
}
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
