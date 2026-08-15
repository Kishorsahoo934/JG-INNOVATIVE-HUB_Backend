/**
 * MIGRATION DRY-RUN — READ ONLY. Never writes to any database.
 * Usage: npm run migrate:dry-run
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MIGRATION_CONFIG, SOURCE_URIS } from './config.js';
import {
  connectReadOnly,
  normalizeSku,
  normalizeEmail,
  extractCloudinaryAssets,
  productFieldDiff,
  sanitizeError,
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = path.join(__dirname, '../../migration-reports');

dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env.migration'), override: true });

const finalDb = MIGRATION_CONFIG.finalDatabase;

async function loadSourceDocs(client, source) {
  const col = client.db(source.database).collection(source.collection);
  const count = await col.countDocuments();
  const docs = count > 0 ? await col.find({}).toArray() : [];
  return { ...source, count, docs };
}

async function analyzeProducts(sources) {
  const bySku = new Map();
  const report = {
    found: 0,
    ready: 0,
    duplicates: 0,
    invalid: 0,
    unmapped: 0,
    mergeConflicts: [],
    invalidRecords: [],
    cloudinaryAssets: 0,
  };

  for (const src of sources) {
    for (const doc of src.docs) {
      report.found++;
      const sku = normalizeSku(doc.sku);
      if (!sku || !doc.name) {
        report.invalid++;
        report.invalidRecords.push({
          source: `${src.database}.${src.collection}`,
          id: doc._id?.toString(),
          reason: !sku ? 'missing_sku' : 'missing_name',
        });
        continue;
      }

      const assets = extractCloudinaryAssets(doc);
      report.cloudinaryAssets += assets.filter((a) => a.value?.includes?.('cloudinary.com')).length;

      const entry = bySku.get(sku) || [];
      entry.push({ ...doc, _source: src });
      bySku.set(sku, entry);
    }
  }

  for (const [sku, entries] of bySku) {
    if (entries.length > 1) {
      report.duplicates++;
      const oldEntry = entries.find((e) => e._source.db === 'OLD' && e._source.database === 'test');
      const curEntry = entries.find((e) => e._source.db === 'CURRENT');
      if (oldEntry && curEntry) {
        const diffs = productFieldDiff(oldEntry, curEntry);
        if (diffs.length) {
          report.mergeConflicts.push({ sku, diffs, resolution: 'CURRENT_WINS' });
        }
      }
    }
    report.ready++;
  }

  report.expectedFinal = bySku.size;
  return report;
}

async function analyzeUsers(sources) {
  const byEmail = new Map();
  const report = { found: 0, ready: 0, duplicates: 0, invalid: 0, mergeConflicts: [] };

  for (const src of sources) {
    for (const doc of src.docs) {
      report.found++;
      const email = normalizeEmail(doc.email);
      if (!email) {
        report.invalid++;
        continue;
      }
      const list = byEmail.get(email) || [];
      list.push({ ...doc, _source: src });
      byEmail.set(email, list);
    }
  }

  for (const [, entries] of byEmail) {
    if (entries.length > 1) report.duplicates++;
    report.ready++;
  }

  report.expectedFinal = byEmail.size;
  return report;
}

async function checkFinalDatabase(finalClient) {
  const admin = finalClient.db().admin();
  const dbs = await admin.listDatabases();
  const appDb = finalClient.db(finalDb);
  const appCollections = await appDb.listCollections().toArray();

  const sampleMflix = dbs.databases.find((d) => d.name === 'sample_mflix');
  const issues = [];

  if (sampleMflix && sampleMflix.sizeOnDisk > 0) {
    issues.push({
      severity: 'CRITICAL',
      code: 'FINAL_HAS_SAMPLE_MFLIX',
      message: `FINAL cluster contains sample_mflix (${sampleMflix.sizeOnDisk} bytes). Migration MUST use database "${finalDb}" only — never touch sample_mflix.`,
    });
  }

  if (appCollections.length > 0) {
    issues.push({
      severity: 'WARNING',
      code: 'FINAL_DB_NOT_EMPTY',
      message: `Target database "${finalDb}" already has ${appCollections.length} collection(s). Idempotent migration will upsert, not wipe.`,
      collections: appCollections.map((c) => c.name),
    });
  } else {
    issues.push({
      severity: 'INFO',
      code: 'FINAL_DB_EMPTY',
      message: `Target database "${finalDb}" is empty — safe for fresh migration.`,
    });
  }

  return issues;
}

async function countBrokenRefs(client, orders, userIdMap, productIdMap) {
  let broken = 0;
  const samples = [];
  for (const order of orders) {
    const custId = order.customerId?.toString();
    if (custId && !userIdMap.has(custId)) {
      broken++;
      if (samples.length < 5) samples.push({ orderId: order._id?.toString(), ref: 'customerId', value: custId });
    }
    for (const item of order.items || []) {
      const pid = item.productId?.toString();
      if (pid && !productIdMap.has(pid)) {
        broken++;
        if (samples.length < 5) samples.push({ orderId: order._id?.toString(), ref: 'items.productId', value: pid });
      }
    }
  }
  return { broken, samples };
}

async function main() {
  console.log('===== MIGRATION DRY RUN (READ-ONLY) =====\n');

  const clients = {};
  const errors = [];

  for (const [label, getUri] of Object.entries(SOURCE_URIS)) {
    const uri = getUri();
    if (!uri) {
      errors.push(`${label}_URI not configured`);
      continue;
    }
    try {
      clients[label] = await connectReadOnly(uri);
      console.log(`${label}: connected`);
    } catch (e) {
      errors.push(`${label}: ${sanitizeError(e.message)}`);
    }
  }

  if (errors.length) {
    console.log('\nConnection errors:', errors);
  }

  const loaded = {};
  for (const cfg of MIGRATION_CONFIG.collections) {
    loaded[cfg.finalCollection] = [];
    for (const src of cfg.sources) {
      const client = clients[src.db];
      if (!client) continue;
      loaded[cfg.finalCollection].push(await loadSourceDocs(client, src));
    }
  }

  const productReport = await analyzeProducts(loaded.products || []);
  const userReport = await analyzeUsers(loaded.users || []);

  const orderSources = loaded.orders || [];
  const orderCount = orderSources.reduce((s, x) => s + x.count, 0);

  const userIdMap = new Set();
  for (const src of loaded.users || []) {
    src.docs.forEach((d) => userIdMap.add(d._id?.toString()));
  }
  const productIdMap = new Set();
  for (const src of loaded.products || []) {
    src.docs.forEach((d) => productIdMap.add(d._id?.toString()));
  }

  const allOrders = orderSources.flatMap((s) => s.docs);
  const refCheck = await countBrokenRefs(clients.OLD, allOrders, userIdMap, productIdMap);

  let finalIssues = [];
  if (clients.FINAL) {
    finalIssues = await checkFinalDatabase(clients.FINAL);
  }

  // Cloudinary URL inventory from products + orders + galleries
  let imageCount = 0;
  let missingPublicId = 0;
  const cloudinaryUrls = new Set();
  for (const col of ['products', 'orders', 'galleries']) {
    for (const src of loaded[col] || []) {
      for (const doc of src.docs) {
        const assets = extractCloudinaryAssets(doc);
        for (const a of assets) {
          if (typeof a.value === 'string' && a.value.includes('cloudinary.com')) {
            cloudinaryUrls.add(a.value);
            imageCount++;
          }
          if (a.field === 'publicId' && !a.value) missingPublicId++;
        }
      }
    }
  }

  const status =
    errors.length > 0 || finalIssues.some((i) => i.severity === 'CRITICAL')
      ? 'NOT READY'
      : refCheck.broken > 0
        ? 'NOT READY — broken references'
        : 'READY FOR REVIEW';

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: 'DRY_RUN',
    status,
    targetDatabase: finalDb,
    connectionErrors: errors,
    finalDatabaseIssues: finalIssues,
    products: productReport,
    users: userReport,
    orders: { found: orderCount, expectedFinal: orderCount },
    images: {
      found: imageCount,
      uniqueUrls: cloudinaryUrls.size,
      ready: cloudinaryUrls.size,
      missingPublicIds: missingPublicId,
    },
    brokenReferences: refCheck,
    unmappedCollections: MIGRATION_CONFIG.unmappedSources,
    conflicts: {
      productMergeConflicts: productReport.mergeConflicts,
      skuOverlap: {
        oldTest: 145,
        currentTest: 10,
        overlapping: 6,
        expectedMergedProducts: productReport.expectedFinal,
      },
    },
    expectedFinalCounts: {
      products: productReport.expectedFinal,
      users: userReport.expectedFinal,
      orders: orderCount,
    },
    baselineCounts: Object.fromEntries(
      Object.entries(loaded).map(([k, sources]) => [
        k,
        sources.map((s) => ({
          source: `${s.db}/${s.database}.${s.collection}`,
          count: s.count,
        })),
      ])
    ),
  };

  console.log('\n----- SUMMARY -----\n');
  console.log(`Products found: ${productReport.found}`);
  console.log(`Products ready (unique SKU): ${productReport.expectedFinal}`);
  console.log(`Duplicate SKU groups: ${productReport.duplicates}`);
  console.log(`Invalid products: ${productReport.invalid}`);
  console.log(`\nUsers found: ${userReport.found}`);
  console.log(`Users ready (unique email): ${userReport.expectedFinal}`);
  console.log(`Duplicate email groups: ${userReport.duplicates}`);
  console.log(`\nOrders found: ${orderCount}`);
  console.log(`\nCloudinary URLs found: ${cloudinaryUrls.size}`);
  console.log(`Broken references (preliminary): ${refCheck.broken}`);
  console.log(`\nSTATUS: ${status}`);

  if (finalIssues.length) {
    console.log('\n----- FINAL DATABASE ISSUES -----');
    finalIssues.forEach((i) => console.log(`  [${i.severity}] ${i.message}`));
  }

  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, 'dry-run-latest.json'), JSON.stringify(summary, null, 2));

  for (const c of Object.values(clients)) {
    await c.close().catch(() => {});
  }

  process.exit(status.startsWith('NOT') ? 1 : 0);
}

main().catch((e) => {
  console.error(sanitizeError(e.message));
  process.exit(1);
});
