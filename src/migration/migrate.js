/**
 * Production migration — writes to FINAL database only (innovativehub).
 * Sources OLD + CURRENT are read-only.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, ObjectId } from 'mongodb';
import { MIGRATION_CONFIG, SOURCE_URIS } from './config.js';
import { normalizeSku, normalizeEmail, sanitizeError } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = path.join(__dirname, '../../migration-reports');

dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env.migration'), override: true });

const PRIORITY = { CURRENT: 3, OLD: 2 };
const SOURCE_DB_PRIORITY = { test: 2, innovativehub: 1 };

function stripMongoInternals(doc) {
  const copy = { ...doc };
  delete copy.__v;
  return copy;
}

function normalizeImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .map((img) => {
      if (typeof img === 'string') return { url: img, publicId: '' };
      if (!img) return null;
      return {
        url: img.url || img.secure_url || '',
        publicId: img.publicId || img.public_id || '',
      };
    })
    .filter((i) => i?.url);
}

function prepareProduct(doc, meta) {
  const p = stripMongoInternals(doc);
  return {
    ...p,
    sku: normalizeSku(p.sku),
    name: p.name || p.title || 'Product',
    shortDescription: p.shortDescription || p.name || 'No description',
    categories: p.categories?.length ? p.categories : ['Uncategorized'],
    mrp: p.mrp ?? p.sellingPrice ?? p.price ?? 0,
    sellingPrice: p.sellingPrice ?? p.price ?? p.mrp ?? 0,
    gstMode: p.gstMode || 'including',
    gstPercentage: p.gstPercentage ?? 18,
    stockQuantity: p.stockQuantity ?? 0,
    stockStatus: p.stockQuantity > 0 ? 'in_stock' : p.stockStatus || 'out_of_stock',
    status: p.status || 'active',
    images: normalizeImages(p.images),
    videos: normalizeImages(p.videos),
    _migrationLegacy: {
      source: meta.sourceKey,
      sourceId: doc._id?.toString(),
      externalId: doc.externalId,
    },
  };
}

function prepareUser(doc, meta) {
  const u = stripMongoInternals(doc);
  if (u.email) u.email = normalizeEmail(u.email);
  u._migrationLegacy = { source: meta.sourceKey, sourceId: doc._id?.toString(), externalId: doc.externalId };
  return u;
}

async function recordMigration(recordsCol, entry) {
  await recordsCol.updateOne(
    {
      sourceCollection: entry.sourceCollection,
      sourceId: entry.sourceId,
      destinationCollection: entry.destinationCollection,
    },
    { $set: { ...entry, updatedAt: new Date() } },
    { upsert: true }
  );
}

async function saveIdMap(idMapCol, sourceKey, sourceId, destCollection, destId) {
  await idMapCol.updateOne(
    { sourceKey, sourceId: String(sourceId) },
    {
      $set: {
        sourceKey,
        sourceId: String(sourceId),
        destinationCollection: destCollection,
        destinationId: String(destId),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

async function getIdMap(idMapCol, sourceKey, sourceId) {
  const row = await idMapCol.findOne({ sourceKey, sourceId: String(sourceId) });
  return row?.destinationId ? new ObjectId(row.destinationId) : null;
}

async function loadAll(client, label, database, collection) {
  const col = client.db(database).collection(collection);
  const docs = await col.find({}).toArray();
  return docs.map((d) => ({
    doc: d,
    meta: {
      label,
      database,
      collection,
      sourceKey: `${label}:${database}.${collection}`,
      priority: PRIORITY[label] ?? 0,
      dbPriority: SOURCE_DB_PRIORITY[database] ?? 0,
    },
  }));
}

async function migrateProducts(finalDb, sources, idMapCol, recordsCol) {
  const bySku = new Map();

  for (const item of sources) {
    const { doc, meta } = item;
    const sku = normalizeSku(doc.sku);
    if (!sku) continue;

    const prepared = prepareProduct(doc, meta);
    const existing = bySku.get(sku);
    if (!existing) {
      bySku.set(sku, { prepared, meta, sourceDocs: [item] });
      continue;
    }

    existing.sourceDocs.push(item);
    const score = meta.priority * 10 + meta.dbPriority;
    const existingScore = existing.meta.priority * 10 + existing.meta.dbPriority;
    if (score >= existingScore) {
      const keepId = existing.prepared._id;
      existing.prepared = { ...prepared, _id: doc._id };
      if (score === existingScore) existing.prepared._id = keepId ?? doc._id;
      else existing.prepared._id = doc._id;
      existing.meta = meta;
    }
  }

  const col = finalDb.collection('products');
  let migrated = 0;

  for (const [sku, { prepared, sourceDocs }] of bySku) {
    const finalId = prepared._id || new ObjectId();
    prepared._id = finalId;
    prepared.sku = sku;

    await col.updateOne({ sku }, { $set: prepared }, { upsert: true });
    const stored = await col.findOne({ sku });

    for (const { doc, meta } of sourceDocs) {
      await saveIdMap(idMapCol, meta.sourceKey, doc._id, 'products', stored._id);
      await recordMigration(recordsCol, {
        sourceDatabase: meta.database,
        sourceCollection: `${meta.database}.${meta.collection}`,
        sourceId: doc._id?.toString(),
        destinationCollection: 'products',
        destinationId: stored._id.toString(),
        migrationStatus: doc._id?.toString() === stored._id.toString() ? 'MIGRATED' : 'MERGED',
        matchKey: sku,
      });
    }
    migrated++;
  }

  return migrated;
}

async function migrateUsers(finalDb, sources, idMapCol, recordsCol) {
  const byEmail = new Map();

  for (const item of sources) {
    const { doc, meta } = item;
    const email = normalizeEmail(doc.email);
    if (!email) continue;

    const prepared = prepareUser(doc, meta);
    const existing = byEmail.get(email);
    if (!existing) {
      byEmail.set(email, { prepared, meta, sourceDocs: [item] });
      continue;
    }

    existing.sourceDocs.push(item);
    const score = meta.priority * 10 + meta.dbPriority;
    const existingScore = existing.meta.priority * 10 + existing.meta.dbPriority;
    if (score >= existingScore) {
      existing.prepared = { ...prepared, _id: doc._id };
      existing.meta = meta;
    }
  }

  const col = finalDb.collection('users');
  let migrated = 0;

  for (const [email, { prepared, sourceDocs }] of byEmail) {
    prepared.email = email;
    prepared._id = prepared._id || new ObjectId();

    await col.updateOne({ email }, { $set: prepared }, { upsert: true });
    const stored = await col.findOne({ email });

    for (const { doc, meta } of sourceDocs) {
      await saveIdMap(idMapCol, meta.sourceKey, doc._id, 'users', stored._id);
      await recordMigration(recordsCol, {
        sourceDatabase: meta.database,
        sourceCollection: `${meta.database}.${meta.collection}`,
        sourceId: doc._id?.toString(),
        destinationCollection: 'users',
        destinationId: stored._id.toString(),
        migrationStatus: doc._id?.toString() === stored._id.toString() ? 'MIGRATED' : 'MERGED',
        matchKey: email,
      });
    }
    migrated++;
  }

  return migrated;
}

async function migrateAdmins(finalDb, sources, recordsCol) {
  const byEmail = new Map();
  for (const item of sources) {
    const email = normalizeEmail(item.doc.email);
    if (!email) continue;
    const score = item.meta.priority;
    if (!byEmail.has(email) || score >= byEmail.get(email).meta.priority) {
      byEmail.set(email, item);
    }
  }

  const col = finalDb.collection('admins');
  for (const [email, { doc, meta }] of byEmail) {
    const admin = stripMongoInternals(doc);
    admin.email = email;
    await col.updateOne({ email }, { $set: admin }, { upsert: true });
    await recordMigration(recordsCol, {
      sourceCollection: `${meta.database}.${meta.collection}`,
      sourceId: doc._id?.toString(),
      destinationCollection: 'admins',
      destinationId: email,
      migrationStatus: 'MIGRATED',
    });
  }
  return byEmail.size;
}

async function remapObjectId(idMapCol, sourceKey, value) {
  if (!value) return value;
  const mapped = await getIdMap(idMapCol, sourceKey, value);
  return mapped || (ObjectId.isValid(String(value)) ? new ObjectId(String(value)) : value);
}

async function migrateOrders(finalDb, oldClient, idMapCol, recordsCol) {
  const orders = await oldClient.db('test').collection('orders').find({}).toArray();
  const col = finalDb.collection('orders');
  let count = 0;

  for (const order of orders) {
    const o = stripMongoInternals(order);
    o._id = order._id;

    const userKey = `OLD:test.users`;
    o.customerId = (await getIdMap(idMapCol, userKey, order.customerId)) || order.customerId;

    if (Array.isArray(o.items)) {
      o.items = await Promise.all(
        o.items.map(async (item) => {
          const productKey = `OLD:test.products`;
          const mapped = await getIdMap(idMapCol, productKey, item.productId);
          return { ...item, productId: mapped || item.productId };
        })
      );
    }

    if (o.coupon_id) {
      const couponKey = `OLD:test.coupons`;
      o.coupon_id = (await getIdMap(idMapCol, couponKey, o.coupon_id)) || o.coupon_id;
    }

    await col.replaceOne({ _id: o._id }, o, { upsert: true });
    await recordMigration(recordsCol, {
      sourceCollection: 'test.orders',
      sourceId: order._id?.toString(),
      destinationCollection: 'orders',
      destinationId: order._id?.toString(),
      migrationStatus: 'MIGRATED',
    });
    count++;
  }
  return count;
}

async function migrateSimpleCollection(finalDb, oldClient, currentClient, cfg, idMapCol, recordsCol) {
  const col = finalDb.collection(cfg.finalCollection);
  let count = 0;

  for (const src of cfg.sources) {
    const client = src.db === 'OLD' ? oldClient : currentClient;
    if (!client) continue;

    const docs = await client.db(src.database).collection(src.collection).find({}).toArray();
    for (const doc of docs) {
      const d = stripMongoInternals(doc);

      if (cfg.finalCollection === 'carts' && d.user) {
        const mapped = await getIdMap(idMapCol, `${src.db}:${src.database}.users`, d.user);
        if (mapped) d.user = mapped;
        if (Array.isArray(d.products)) {
          for (const p of d.products) {
            if (p.product) {
              const mp = await getIdMap(idMapCol, `${src.db}:${src.database}.products`, p.product);
              if (mp) p.product = mp;
            }
          }
        }
      }

      if (cfg.finalCollection === 'payments' && d.orderId) {
        // order IDs preserved
      }

      if (cfg.finalCollection === 'reviews' || cfg.finalCollection === 'ratings' || cfg.finalCollection === 'comments') {
        if (d.productId) {
          d.productId = (await getIdMap(idMapCol, 'OLD:test.products', d.productId)) || d.productId;
        }
        if (d.userId) {
          d.userId = (await getIdMap(idMapCol, 'OLD:test.users', d.userId)) || d.userId;
        }
      }

      if (cfg.finalCollection === 'coupons' && d.coupon_code) {
        await col.updateOne({ coupon_code: d.coupon_code }, { $set: d }, { upsert: true });
      } else if (cfg.finalCollection === 'offlineorders' && d.invoiceNumber) {
        await col.updateOne({ invoiceNumber: d.invoiceNumber }, { $set: d }, { upsert: true });
      } else if (cfg.finalCollection === 'deliverystates' && d.state) {
        await col.updateOne({ state: d.state }, { $set: d }, { upsert: true });
      } else {
        await col.replaceOne({ _id: d._id }, d, { upsert: true });
      }

      await recordMigration(recordsCol, {
        sourceCollection: `${src.database}.${src.collection}`,
        sourceId: doc._id?.toString(),
        destinationCollection: cfg.finalCollection,
        destinationId: doc._id?.toString(),
        migrationStatus: 'MIGRATED',
      });
      count++;
    }
  }
  return count;
}

async function main() {
  if (process.env.MIGRATE_EXECUTE !== 'true') {
    console.error('Set MIGRATE_EXECUTE=true to run migration.');
    process.exit(1);
  }

  const finalDbName = MIGRATION_CONFIG.finalDatabase;
  const oldUri = SOURCE_URIS.OLD();
  const curUri = SOURCE_URIS.CURRENT();
  const finalUri = SOURCE_URIS.FINAL();

  if (!oldUri || !curUri || !finalUri) {
    console.error('Missing OLD/CURRENT/FINAL MongoDB URIs in .env.migration');
    process.exit(1);
  }

  const oldClient = new MongoClient(oldUri, { readPreference: 'secondaryPreferred' });
  const curClient = new MongoClient(curUri, { readPreference: 'secondaryPreferred' });
  const finalClient = new MongoClient(finalUri);

  const report = { startedAt: new Date().toISOString(), steps: {}, errors: [] };

  try {
    await oldClient.connect();
    await curClient.connect();
    await finalClient.connect();

    const finalDb = finalClient.db(finalDbName);
    const idMapCol = finalDb.collection('migration_id_map');
    const recordsCol = finalDb.collection('migration_records');
    const runsCol = finalDb.collection('migration_runs');

    await idMapCol.createIndex({ sourceKey: 1, sourceId: 1 }, { unique: true });
    await recordsCol.createIndex({ sourceId: 1, destinationCollection: 1 });

    console.log(`Migrating to database: ${finalDbName}`);

    // Admins
    const adminSources = [
      ...(await loadAll(oldClient, 'OLD', 'test', 'admins')),
      ...(await loadAll(oldClient, 'OLD', 'innovativehub', 'admins')),
      ...(await loadAll(curClient, 'CURRENT', 'test', 'admins')),
    ];
    report.steps.admins = await migrateAdmins(finalDb, adminSources, recordsCol);
    console.log(`Admins: ${report.steps.admins}`);

    // Users
    const userSources = [
      ...(await loadAll(oldClient, 'OLD', 'test', 'users')),
      ...(await loadAll(oldClient, 'OLD', 'innovativehub', 'users')),
      ...(await loadAll(curClient, 'CURRENT', 'test', 'users')),
    ];
    report.steps.users = await migrateUsers(finalDb, userSources, idMapCol, recordsCol);
    console.log(`Users: ${report.steps.users}`);

    // Products
    const productSources = [
      ...(await loadAll(oldClient, 'OLD', 'test', 'products')),
      ...(await loadAll(oldClient, 'OLD', 'innovativehub', 'products')),
      ...(await loadAll(curClient, 'CURRENT', 'test', 'products')),
    ];
    report.steps.products = await migrateProducts(finalDb, productSources, idMapCol, recordsCol);
    console.log(`Products: ${report.steps.products}`);

    // Orders (with ID remap)
    report.steps.orders = await migrateOrders(finalDb, oldClient, idMapCol, recordsCol);
    console.log(`Orders: ${report.steps.orders}`);

    // Other collections
    const simpleCollections = MIGRATION_CONFIG.collections.filter(
      (c) => !['admins', 'users', 'products', 'orders'].includes(c.finalCollection)
    );

    for (const cfg of simpleCollections) {
      try {
        const n = await migrateSimpleCollection(finalDb, oldClient, curClient, cfg, idMapCol, recordsCol);
        report.steps[cfg.finalCollection] = n;
        console.log(`${cfg.finalCollection}: ${n}`);
      } catch (e) {
        report.errors.push({ collection: cfg.finalCollection, error: sanitizeError(e.message) });
        console.warn(`${cfg.finalCollection} warning:`, sanitizeError(e.message));
      }
    }

    // Final counts
    report.finalCounts = {};
    for (const name of ['products', 'users', 'orders', 'payments', 'carts', 'admins']) {
      report.finalCounts[name] = await finalDb.collection(name).countDocuments();
    }

    report.completedAt = new Date().toISOString();
    report.status = 'SUCCESS';

    await runsCol.insertOne(report);

    if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
    fs.writeFileSync(path.join(REPORT_DIR, 'migration-report-latest.json'), JSON.stringify(report, null, 2));

    console.log('\n===== MIGRATION COMPLETE =====');
    console.log(JSON.stringify(report.finalCounts, null, 2));
  } catch (e) {
    console.error('Migration failed:', sanitizeError(e.message));
    process.exit(1);
  } finally {
    await oldClient.close().catch(() => {});
    await curClient.close().catch(() => {});
    await finalClient.close().catch(() => {});
  }
}

main();
