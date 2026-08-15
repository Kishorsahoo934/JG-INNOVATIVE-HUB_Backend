/**
 * READ-ONLY database audit — never writes to any database.
 * Usage: node src/migration/audit-databases.js
 *
 * Required env (see .env.migration.example):
 *   OLD_MONGODB_URI, CURRENT_MONGODB_URI (or MONGODB_URI), FINAL_MONGODB_URI
 */
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = path.join(__dirname, '../../migration-reports');

dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env.migration'), override: true });

const SOURCES = [
  { label: 'OLD', uri: process.env.OLD_MONGODB_URI },
  {
    label: 'CURRENT',
    uri: process.env.CURRENT_MONGODB_URI || process.env.MONGODB_URI,
  },
  { label: 'FINAL', uri: process.env.FINAL_MONGODB_URI },
];

function sanitizeUri(uri) {
  if (!uri) return '(not set)';
  try {
    const u = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, 'https://'));
    return `mongodb${uri.includes('+srv') ? '+srv' : ''}://***@${u.hostname}${u.pathname || ''}`;
  } catch {
    return '(invalid uri)';
  }
}

function inferFieldTypes(doc, prefix = '', depth = 0) {
  const fields = {};
  if (!doc || typeof doc !== 'object' || depth > 3) return fields;

  for (const [key, value] of Object.entries(doc)) {
    const pathKey = prefix ? `${prefix}.${key}` : key;
    if (value === null || value === undefined) {
      fields[pathKey] = 'null';
    } else if (Array.isArray(value)) {
      fields[pathKey] = `array[${value.length}]`;
      if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
        Object.assign(fields, inferFieldTypes(value[0], `${pathKey}[]`, depth + 1));
      } else if (value.length > 0) {
        fields[`${pathKey}[]`] = typeof value[0];
      }
    } else if (value instanceof Date) {
      fields[pathKey] = 'Date';
    } else if (typeof value === 'object' && value._bsontype === 'ObjectId') {
      fields[pathKey] = 'ObjectId';
    } else if (typeof value === 'object') {
      fields[pathKey] = 'object';
      Object.assign(fields, inferFieldTypes(value, pathKey, depth + 1));
    } else {
      fields[pathKey] = typeof value;
    }
  }
  return fields;
}

function findCloudinaryRefs(doc, refs = []) {
  if (!doc || typeof doc !== 'object') return refs;
  if (Array.isArray(doc)) {
    doc.forEach((item) => findCloudinaryRefs(item, refs));
    return refs;
  }
  for (const value of Object.values(doc)) {
    if (typeof value === 'string' && value.includes('res.cloudinary.com')) {
      refs.push(value);
    } else if (typeof value === 'object') {
      findCloudinaryRefs(value, refs);
    }
  }
  return refs;
}

async function auditDatabase(source) {
  if (!source.uri) {
    return {
      label: source.label,
      connected: false,
      error: 'URI not configured',
      sanitizedUri: sanitizeUri(source.uri),
      collections: [],
    };
  }

  const client = new MongoClient(source.uri, {
    readPreference: 'secondaryPreferred',
    serverSelectionTimeoutMS: 15000,
  });

  try {
    await client.connect();
    const admin = client.db().admin();
    const dbList = await admin.listDatabases();
    const dbNames = dbList.databases
      .map((d) => d.name)
      .filter((n) => !['admin', 'local', 'config'].includes(n));

    const collections = [];

    for (const dbName of dbNames) {
      const db = client.db(dbName);
      const colNames = await db.listCollections().toArray();
      for (const colInfo of colNames) {
        const colName = colInfo.name;
        if (colName.startsWith('system.')) continue;

        const col = db.collection(colName);
        const count = await col.countDocuments();
        const sample = count > 0 ? await col.findOne({}) : null;
        const indexes = await col.indexes();
        const cloudinaryUrls = sample ? findCloudinaryRefs(sample).slice(0, 5) : [];

        collections.push({
          database: dbName,
          collection: colName,
          documentCount: count,
          indexes: indexes.map((idx) => ({
            name: idx.name,
            key: idx.key,
            unique: Boolean(idx.unique),
          })),
          sampleFieldTypes: sample ? inferFieldTypes(sample) : {},
          sampleId: sample?._id?.toString?.() ?? null,
          cloudinaryUrlCountInSample: cloudinaryUrls.length,
          sampleCloudinaryHosts: [
            ...new Set(
              cloudinaryUrls.map((u) => {
                try {
                  return new URL(u).hostname;
                } catch {
                  return 'unknown';
                }
              })
            ),
          ],
        });
      }
    }

    collections.sort((a, b) =>
      a.database === b.database
        ? a.collection.localeCompare(b.collection)
        : a.database.localeCompare(b.database)
    );

    return {
      label: source.label,
      connected: true,
      sanitizedUri: sanitizeUri(source.uri),
      databaseCount: dbNames.length,
      databaseNames: dbNames,
      totalDocuments: collections.reduce((s, c) => s + c.documentCount, 0),
      collectionCount: collections.length,
      collections,
    };
  } catch (err) {
    return {
      label: source.label,
      connected: false,
      sanitizedUri: sanitizeUri(source.uri),
      error: err.message?.replace(/mongodb(\+srv)?:\/\/[^\s@]+@/gi, 'mongodb://***@') ?? String(err),
      collections: [],
    };
  } finally {
    await client.close().catch(() => {});
  }
}

async function main() {
  console.log('===== READ-ONLY DATABASE AUDIT =====\n');

  const results = [];
  for (const source of SOURCES) {
    console.log(`Auditing ${source.label}...`);
    const result = await auditDatabase(source);
    results.push(result);
    if (result.connected) {
      console.log(
        `  Connected (${result.sanitizedUri}): ${result.collectionCount} collections, ${result.totalDocuments} documents`
      );
    } else {
      console.log(`  FAILED: ${result.error}`);
    }
  }

  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(REPORT_DIR, `audit-inventory-${timestamp}.json`);
  const latestPath = path.join(REPORT_DIR, 'audit-inventory-latest.json');

  const report = {
    generatedAt: new Date().toISOString(),
    sources: results,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));

  console.log(`\nReport written to: migration-reports/audit-inventory-latest.json`);

  // Console summary table
  console.log('\n----- COLLECTION INVENTORY -----\n');
  for (const src of results) {
    console.log(`\n[${src.label}] ${src.connected ? 'OK' : 'FAILED'}`);
    if (!src.connected) continue;
    for (const c of src.collections) {
      console.log(`  ${c.database}.${c.collection}: ${c.documentCount}`);
    }
  }
}

main().catch((err) => {
  console.error('Audit failed:', err.message?.replace(/mongodb(\+srv)?:\/\/[^\s@]+@/gi, 'mongodb://***@'));
  process.exit(1);
});
