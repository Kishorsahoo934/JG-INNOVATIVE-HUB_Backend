/**
 * Pre-migration backup helper — exports collection counts + optional mongodump command hints.
 * Does NOT modify source databases.
 *
 * Usage: npm run migrate:backup
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectReadOnly, sanitizeError } from './utils.js';
import { SOURCE_URIS } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(__dirname, '../../migration-reports/backups');

dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env.migration'), override: true });

async function snapshot(label, uri) {
  const client = await connectReadOnly(uri);
  try {
    const admin = client.db().admin();
    const { databases } = await admin.listDatabases();
    const snapshot = { label, timestamp: new Date().toISOString(), databases: [] };

    for (const dbInfo of databases) {
      if (['admin', 'local', 'config'].includes(dbInfo.name)) continue;
      const db = client.db(dbInfo.name);
      const cols = await db.listCollections().toArray();
      const collections = [];
      for (const c of cols) {
        if (c.name.startsWith('system.')) continue;
        const count = await db.collection(c.name).countDocuments();
        collections.push({ collection: c.name, documentCount: count });
      }
      snapshot.databases.push({
        name: dbInfo.name,
        collections,
        totalDocuments: collections.reduce((s, x) => s + x.documentCount, 0),
      });
    }
    return snapshot;
  } finally {
    await client.close().catch(() => {});
  }
}

async function main() {
  console.log('===== BACKUP BASELINE SNAPSHOT =====\n');

  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const snapshots = [];
  for (const [label, getUri] of Object.entries(SOURCE_URIS)) {
    const uri = getUri();
    if (!uri) {
      console.log(`${label}: skipped (URI not set)`);
      continue;
    }
    try {
      const snap = await snapshot(label, uri);
      snapshots.push(snap);
      console.log(`${label}: ${snap.databases.length} databases catalogued`);
    } catch (e) {
      console.log(`${label}: FAILED — ${sanitizeError(e.message)}`);
    }
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(BACKUP_DIR, `baseline-${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ snapshots }, null, 2));
  fs.writeFileSync(path.join(BACKUP_DIR, 'baseline-latest.json'), JSON.stringify({ snapshots }, null, 2));

  console.log(`\nBaseline written: migration-reports/backups/baseline-latest.json`);
  console.log('\nFor full binary backup, run locally (requires mongodump installed):');
  console.log('  mongodump --uri="<OLD_MONGODB_URI>" --out=./backups/old-$(date +%Y%m%d)');
  console.log('  mongodump --uri="<CURRENT_MONGODB_URI>" --out=./backups/current-$(date +%Y%m%d)');
  console.log('\nCloudinary: use Cloudinary Admin API export or account backup before asset migration.');
}

main().catch((e) => {
  console.error(sanitizeError(e.message));
  process.exit(1);
});
