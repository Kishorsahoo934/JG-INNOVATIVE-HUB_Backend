/**
 * READ-ONLY schema deep-dive for key e-shop collections.
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

const TARGETS = [
  {
    label: 'OLD',
    uri: process.env.OLD_MONGODB_URI,
    databases: [
      { db: 'test', collections: ['products', 'users', 'orders', 'carts', 'coupons', 'ideas', 'projects'] },
      { db: 'innovativehub', collections: ['products', 'users', 'orders'] },
      { db: 'resources_hub', collections: ['resources_products', 'resources_users', 'resources_projects'] },
    ],
  },
  {
    label: 'CURRENT',
    uri: process.env.CURRENT_MONGODB_URI || process.env.MONGODB_URI,
    databases: [{ db: 'test', collections: ['products', 'users', 'orders', 'carts', 'projects', 'ideas', 'courses'] }],
  },
];

function allKeys(obj, prefix = '', depth = 0, keys = new Set()) {
  if (!obj || typeof obj !== 'object' || depth > 4) return keys;
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    keys.add(p);
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      allKeys(v, p, depth + 1, keys);
    } else if (Array.isArray(v) && v[0] && typeof v[0] === 'object') {
      allKeys(v[0], `${p}[]`, depth + 1, keys);
    }
  }
  return keys;
}

function cloudinaryStats(docs) {
  let urlCount = 0;
  const hosts = new Set();
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(walk);
    for (const v of Object.values(o)) {
      if (typeof v === 'string' && v.includes('cloudinary.com')) {
        urlCount++;
        try {
          hosts.add(new URL(v).hostname);
        } catch {}
      } else if (typeof v === 'object') walk(v);
    }
  };
  docs.forEach(walk);
  return { urlCount, hosts: [...hosts] };
}

async function analyzeCollection(client, dbName, colName) {
  const col = client.db(dbName).collection(colName);
  const count = await col.countDocuments();
  if (count === 0) {
    return { db: dbName, collection: colName, documentCount: 0, exists: true };
  }

  const samples = await col.find({}).limit(3).toArray();
  const allFieldKeys = [...allKeys(samples[0])].sort();
  const unionKeys = new Set();
  samples.forEach((s) => allKeys(s).forEach((k) => unionKeys.add(k)));

  const skuSamples = await col.distinct('sku').catch(() => []);
  const emailSamples =
    colName.includes('user') || colName === 'users'
      ? await col.distinct('email').catch(() => [])
      : [];

  return {
    db: dbName,
    collection: colName,
    documentCount: count,
    exists: true,
    fieldKeysFromSample: allFieldKeys,
    fieldKeysUnionAcrossSamples: [...unionKeys].sort(),
    distinctSkuCount: skuSamples.length,
    sampleSkus: skuSamples.slice(0, 5),
    distinctEmailCount: emailSamples.length,
    sampleEmails: emailSamples.slice(0, 3).map((e) => (e ? `${String(e).slice(0, 3)}***` : e)),
    cloudinary: cloudinaryStats(samples),
    sampleIds: samples.map((s) => s._id?.toString()),
  };
}

async function main() {
  const report = { generatedAt: new Date().toISOString(), sources: [] };

  for (const target of TARGETS) {
    const client = new MongoClient(target.uri, { readPreference: 'secondaryPreferred' });
    const sourceReport = { label: target.label, collections: [] };
    try {
      await client.connect();
      for (const { db, collections } of target.databases) {
        for (const colName of collections) {
          const exists = (await client.db(db).listCollections({ name: colName }).toArray()).length > 0;
          if (!exists) {
            sourceReport.collections.push({ db, collection: colName, exists: false, documentCount: 0 });
            continue;
          }
          sourceReport.collections.push(await analyzeCollection(client, db, colName));
        }
      }
    } finally {
      await client.close().catch(() => {});
    }
    report.sources.push(sourceReport);
  }

  // SKU overlap analysis between OLD test.products and CURRENT test.products
  const oldClient = new MongoClient(process.env.OLD_MONGODB_URI);
  const curClient = new MongoClient(process.env.CURRENT_MONGODB_URI || process.env.MONGODB_URI);
  try {
    await oldClient.connect();
    await curClient.connect();
    const oldSkus = new Set(
      (await oldClient.db('test').collection('products').distinct('sku')).map((s) =>
        String(s).toUpperCase()
      )
    );
    const curSkus = (await curClient.db('test').collection('products').distinct('sku')).map((s) =>
      String(s).toUpperCase()
    );
    const overlap = curSkus.filter((s) => oldSkus.has(s));
    const oldOnly = [...oldSkus].filter((s) => !curSkus.includes(s));
    const curOnly = curSkus.filter((s) => !oldSkus.has(s));

    report.skuOverlap = {
      oldTestProducts: oldSkus.size,
      currentTestProducts: curSkus.length,
      overlappingSkus: overlap.length,
      overlapSamples: overlap.slice(0, 10),
      oldOnlyCount: oldOnly.length,
      currentOnlyCount: curOnly.length,
    };

    // Email overlap users
    const oldEmails = new Set(
      (await oldClient.db('test').collection('users').distinct('email')).map((e) =>
        String(e).toLowerCase()
      )
    );
    const curEmails = (await curClient.db('test').collection('users').distinct('email')).map((e) =>
      String(e).toLowerCase()
    );
    report.emailOverlap = {
      oldUsers: oldEmails.size,
      currentUsers: curEmails.length,
      overlapping: curEmails.filter((e) => oldEmails.has(e)).length,
    };
  } finally {
    await oldClient.close().catch(() => {});
    await curClient.close().catch(() => {});
  }

  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, 'schema-deep-dive-latest.json'), JSON.stringify(report, null, 2));

  console.log('Schema deep-dive complete.');
  console.log(JSON.stringify(report.skuOverlap, null, 2));
  console.log(JSON.stringify(report.emailOverlap, null, 2));
}

main().catch((e) => {
  console.error(e.message?.replace(/mongodb(\+srv)?:\/\/[^\s@]+@/gi, 'mongodb://***@'));
  process.exit(1);
});
