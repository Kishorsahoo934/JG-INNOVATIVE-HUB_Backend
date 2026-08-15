/**
 * Shared migration utilities — read-only safe helpers.
 */
import { MongoClient } from 'mongodb';

export function sanitizeError(msg) {
  return String(msg || '').replace(/mongodb(\+srv)?:\/\/[^\s@]+@/gi, 'mongodb://***@');
}

export async function connectReadOnly(uri) {
  const client = new MongoClient(uri, {
    readPreference: 'secondaryPreferred',
    serverSelectionTimeoutMS: 20000,
  });
  await client.connect();
  return client;
}

export function normalizeSku(v) {
  return String(v || '').trim().toUpperCase();
}

export function normalizeEmail(v) {
  return String(v || '').trim().toLowerCase();
}

/** Extract all cloudinary URLs and public IDs from a document tree */
export function extractCloudinaryAssets(doc, found = []) {
  if (!doc || typeof doc !== 'object') return found;
  if (Array.isArray(doc)) {
    doc.forEach((item) => extractCloudinaryAssets(item, found));
    return found;
  }
  for (const [key, value] of Object.entries(doc)) {
    if (typeof value === 'string') {
      if (value.includes('res.cloudinary.com') || key === 'publicId' || key === 'public_id') {
        found.push({ field: key, value });
      }
    } else if (typeof value === 'object') {
      extractCloudinaryAssets(value, found);
    }
  }
  return found;
}

export function mapInnovativehubProduct(doc) {
  return {
    name: doc.name,
    sku: normalizeSku(doc.sku),
    shortDescription: doc.shortDescription || doc.name || 'Migrated product',
    longDescription: doc.longDescription || '',
    categories: doc.categories?.length ? doc.categories : ['Uncategorized'],
    mrp: doc.mrp ?? doc.sellingPrice ?? 0,
    sellingPrice: doc.sellingPrice ?? doc.mrp ?? 0,
    gstMode: doc.gstMode || 'including',
    gstPercentage: doc.gstPercentage ?? 18,
    stockQuantity: doc.stockQuantity ?? 0,
    stockStatus: doc.stockStatus || (doc.stockQuantity > 0 ? 'in_stock' : 'out_of_stock'),
    status: doc.status || 'active',
    images: Array.isArray(doc.images)
      ? doc.images.map((img) =>
          typeof img === 'string'
            ? { url: img, publicId: '' }
            : { url: img.url || '', publicId: img.publicId || img.public_id || '' }
        )
      : [],
    videos: doc.videos || [],
    _migrationLegacy: {
      sourceDatabase: doc._migrationSource?.database,
      sourceCollection: doc._migrationSource?.collection,
      sourceId: doc._id?.toString?.(),
      externalId: doc.externalId,
      rawFields: doc.externalId ? { externalId: doc.externalId } : undefined,
    },
  };
}

export function productFieldDiff(a, b) {
  const fields = ['name', 'mrp', 'sellingPrice', 'stockQuantity', 'status'];
  const diffs = [];
  for (const f of fields) {
    if (a[f] !== undefined && b[f] !== undefined && a[f] !== b[f]) {
      diffs.push({ field: f, old: a[f], current: b[f] });
    }
  }
  return diffs;
}
