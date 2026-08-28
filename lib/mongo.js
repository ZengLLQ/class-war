import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME && process.env.DB_NAME !== 'your_database_name' ? process.env.DB_NAME : 'warkelas';

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, { maxPoolSize: 50 });
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export async function getDb() {
  const c = await clientPromise;
  return c.db(dbName);
}

let indexesReady = false;
export async function ensureIndexes() {
  if (indexesReady) return;
  const db = await getDb();
  await db.collection('wars').createIndex({ id: 1 }, { unique: true });
  await db.collection('wars').createIndex({ code: 1 }, { unique: true });
  await db.collection('participants').createIndex({ id: 1 }, { unique: true });
  await db.collection('participants').createIndex({ warId: 1 });
  await db.collection('participants').createIndex({ warId: 1, participantCode: 1 }, { unique: true });
  await db.collection('activity_logs').createIndex({ warId: 1, createdAt: -1 });
  indexesReady = true;
}
