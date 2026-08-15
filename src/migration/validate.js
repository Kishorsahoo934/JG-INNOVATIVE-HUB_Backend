/**
 * Post-migration validation — READ ONLY on FINAL, compares against expected counts.
 * Usage: npm run migrate:validate
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import { MIGRATION_CONFIG } from './config.js';
import { sanitizeError, normalizeSku, normalizeEmail } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = path.join(__dirname, '../../migration-reports');

dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env.migration'), override: true });

async function main() {
  const uri = process.env.FINAL_MONGODB_URI;
  if (!uri) throw new Error('FINAL_MONGODB_URI not set');

  const dryRunPath = path.join(REPORT_DIR, 'dry-run-latest.json');
  if (!fs.existsSync(dryRunPath)) {
    throw new Error('Run migrate:dry-run first to establish expected counts');
  }
  const dryRun = JSON.parse(fs.readFileSync(dryRunPath, 'utf8'));
  const expected = dryRun.expectedFinalCounts || {};
  const dbName = MIGRATION_CONFIG.finalDatabase;

  const client = new MongoClient(uri, { readPreference: 'secondaryPreferred' });
  await client.connect();
  const db = client.db(dbName);

  const report = {
    generatedAt: new Date().toISOString(),
    targetDatabase: dbName,
    collections: {},
    validationStatus: 'PASS',
  };

  const checks = [
    ['products', 'sku', normalizeSku],
    ['users', 'email', normalizeEmail],
    ['orders', '_id', (v) => v?.toString()],
  ];

  for (const [col, field, norm] of checks) {
    const expectedCount = expected[col];
    const actualCount = await db.collection(col).countDocuments();
    const distinct = await db.collection(col).distinct(field);
    const uniqueCount = new Set(distinct.map(norm).filter(Boolean)).size;

    const entry = { expectedCount, actualCount, uniqueKeys: uniqueCount };
    if (expectedCount !== undefined && actualCount < expectedCount) {
      entry.status = 'FAIL';
      report.validationStatus = 'FAIL';
    } else {
      entry.status = 'PASS';
    }
    report.collections[col] = entry;
  }

  // Spot-check products by SKU hash
  const sampleProducts = await db.collection('products').find({}).limit(5).toArray();
  report.sampleProductChecks = sampleProducts.map((p) => ({
    sku: p.sku,
    name: p.name,
    sellingPrice: p.sellingPrice,
    hasImages: Boolean(p.images?.length),
  }));

  fs.writeFileSync(path.join(REPORT_DIR, 'validation-latest.json'), JSON.stringify(report, null, 2));

  console.log('===== MIGRATION VALIDATION =====\n');
  console.log(`Database: ${dbName}`);
  console.log(`Status: ${report.validationStatus}`);
  for (const [col, data] of Object.entries(report.collections)) {
    console.log(`  ${col}: expected=${data.expectedCount} actual=${data.actualCount} [${data.status}]`);
  }

  await client.close();
  process.exit(report.validationStatus === 'PASS' ? 0 : 1);
}

main().catch((e) => {
  console.error(sanitizeError(e.message));
  process.exit(1);
});
