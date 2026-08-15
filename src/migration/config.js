/**
 * Migration configuration — maps source collections to final Mongoose-aligned targets.
 * FINAL schema = current application Mongoose models (database: test by default).
 */
export const MIGRATION_CONFIG = {
  /** Target database name on FINAL cluster (NOT sample_mflix) */
  finalDatabase: process.env.FINAL_MONGODB_DB || 'innovativehub',

  /** Stable keys for idempotent upserts */
  matchKeys: {
    products: ['sku'],
    users: ['email'],
    orders: ['_id'], // preserve original _id for order history integrity
    admins: ['email'],
    coupons: ['coupon_code'],
    offlineorders: ['invoiceNumber'],
  },

  /**
   * Collection migration order (respects FK dependencies).
   * Each entry: sources[] merged into finalCollection.
   */
  collections: [
    {
      finalCollection: 'admins',
      sources: [
        { db: 'OLD', database: 'test', collection: 'admins' },
        { db: 'OLD', database: 'innovativehub', collection: 'admins' },
        { db: 'CURRENT', database: 'test', collection: 'admins' },
      ],
      mergeStrategy: 'email_wins_current',
    },
    {
      finalCollection: 'users',
      sources: [
        { db: 'OLD', database: 'test', collection: 'users' },
        { db: 'OLD', database: 'innovativehub', collection: 'users' },
        { db: 'CURRENT', database: 'test', collection: 'users' },
      ],
      mergeStrategy: 'email_merge_current_wins',
      preserveLegacyField: '_migrationLegacy',
    },
    {
      finalCollection: 'products',
      sources: [
        { db: 'OLD', database: 'test', collection: 'products' },
        { db: 'OLD', database: 'innovativehub', collection: 'products' },
        { db: 'CURRENT', database: 'test', collection: 'products' },
      ],
      mergeStrategy: 'sku_merge_current_wins',
      preserveLegacyField: '_migrationLegacy',
    },
    {
      finalCollection: 'coupons',
      sources: [
        { db: 'OLD', database: 'test', collection: 'coupons' },
        { db: 'CURRENT', database: 'test', collection: 'coupons' },
      ],
      mergeStrategy: 'coupon_code_merge',
    },
    {
      finalCollection: 'deliverysettings',
      sources: [
        { db: 'OLD', database: 'test', collection: 'deliverysettings' },
        { db: 'CURRENT', database: 'test', collection: 'deliverysettings' },
      ],
      mergeStrategy: 'current_wins_if_exists',
    },
    {
      finalCollection: 'deliverystates',
      sources: [
        { db: 'OLD', database: 'test', collection: 'deliverystates' },
        { db: 'CURRENT', database: 'test', collection: 'deliverystates' },
      ],
      mergeStrategy: 'merge_by_state',
      matchKeys: ['state'],
    },
    {
      finalCollection: 'galleries',
      sources: [
        { db: 'OLD', database: 'test', collection: 'galleries' },
        { db: 'CURRENT', database: 'test', collection: 'galleries' },
      ],
      mergeStrategy: 'title_category_dedupe',
    },
    {
      finalCollection: 'orders',
      sources: [{ db: 'OLD', database: 'test', collection: 'orders' }],
      mergeStrategy: 'preserve_ids',
      requiresIdMap: ['customerId', 'items.productId', 'coupon_id'],
    },
    {
      finalCollection: 'payments',
      sources: [{ db: 'OLD', database: 'test', collection: 'payments' }],
      mergeStrategy: 'preserve_ids',
      requiresIdMap: ['orderId'],
    },
    {
      finalCollection: 'carts',
      sources: [
        { db: 'OLD', database: 'test', collection: 'carts' },
        { db: 'CURRENT', database: 'test', collection: 'carts' },
      ],
      mergeStrategy: 'user_active_cart_current_wins',
      requiresIdMap: ['user', 'products.product'],
    },
    {
      finalCollection: 'reviews',
      sources: [{ db: 'OLD', database: 'test', collection: 'reviews' }],
      requiresIdMap: ['productId', 'userId', 'orderId'],
    },
    {
      finalCollection: 'ratings',
      sources: [{ db: 'OLD', database: 'test', collection: 'ratings' }],
      requiresIdMap: ['productId', 'userId'],
    },
    {
      finalCollection: 'comments',
      sources: [
        { db: 'OLD', database: 'test', collection: 'comments' },
        { db: 'CURRENT', database: 'test', collection: 'comments' },
      ],
      requiresIdMap: ['productId', 'userId', 'orderId'],
    },
    {
      finalCollection: 'offlineorders',
      sources: [{ db: 'OLD', database: 'test', collection: 'offlineorders' }],
      mergeStrategy: 'invoice_number_unique',
    },
    {
      finalCollection: 'productprofits',
      sources: [{ db: 'OLD', database: 'test', collection: 'productprofits' }],
    },
    {
      finalCollection: 'notifications',
      sources: [
        { db: 'OLD', database: 'test', collection: 'notifications' },
        { db: 'CURRENT', database: 'test', collection: 'notifications' },
      ],
    },
    {
      finalCollection: 'reviewsettings',
      sources: [
        { db: 'OLD', database: 'test', collection: 'reviewsettings' },
        { db: 'CURRENT', database: 'test', collection: 'reviewsettings' },
      ],
      mergeStrategy: 'singleton_current_wins',
    },
    {
      finalCollection: 'invoicecounters',
      sources: [
        { db: 'OLD', database: 'test', collection: 'invoicecounters' },
        { db: 'CURRENT', database: 'test', collection: 'invoicecounters' },
      ],
      mergeStrategy: 'max_counter',
    },
    {
      finalCollection: 'visitors',
      sources: [
        { db: 'OLD', database: 'test', collection: 'visitors' },
        { db: 'CURRENT', database: 'test', collection: 'visitors' },
      ],
    },
    {
      finalCollection: 'workshops',
      sources: [
        { db: 'OLD', database: 'test', collection: 'workshops' },
        { db: 'CURRENT', database: 'test', collection: 'workshops' },
      ],
    },
    {
      finalCollection: 'internships',
      sources: [
        { db: 'OLD', database: 'test', collection: 'internships' },
        { db: 'CURRENT', database: 'test', collection: 'internships' },
      ],
    },
    {
      finalCollection: 'sessionslots',
      sources: [{ db: 'CURRENT', database: 'test', collection: 'sessionslots' }],
    },
    {
      finalCollection: 'dashboardadjustments',
      sources: [
        { db: 'OLD', database: 'test', collection: 'dashboardadjustments' },
        { db: 'CURRENT', database: 'test', collection: 'dashboardadjustments' },
      ],
    },
  ],

  /** Collections found in DB but NOT in current backend — require explicit decision */
  unmappedSources: [
    { db: 'OLD', database: 'test', collection: 'ideas', docs: 12 },
    { db: 'OLD', database: 'test', collection: 'ideaownerships', docs: 5 },
    { db: 'OLD', database: 'test', collection: 'transactions', docs: 5 },
    { db: 'OLD', database: 'test', collection: 'wallets', docs: 7 },
    { db: 'OLD', database: 'test', collection: 'withdrawals', docs: 3 },
    { db: 'OLD', database: 'test', collection: 'mobileotps', docs: 1 },
    { db: 'OLD', database: 'innovativehub', collection: 'orders', docs: 3 },
    { db: 'OLD', database: 'innovativehub', collection: 'products', docs: 3 },
    { db: 'OLD', database: 'innovativehub', collection: 'users', docs: 2 },
    { db: 'OLD', database: 'resources_hub', collection: '*', docs: 39 },
    { db: 'CURRENT', database: 'test', collection: 'projects', docs: 3 },
    { db: 'CURRENT', database: 'test', collection: 'ideas', docs: 8 },
    { db: 'CURRENT', database: 'test', collection: 'ideacomments', docs: 5 },
    { db: 'CURRENT', database: 'test', collection: 'courses', docs: 3 },
    { db: 'CURRENT', database: 'test', collection: 'courseenrollments', docs: 0 },
    { db: 'CURRENT', database: 'test', collection: 'mentorshipplans', docs: 3 },
    { db: 'CURRENT', database: 'test', collection: 'mentorshiprequests', docs: 1 },
    { db: 'CURRENT', database: 'test', collection: 'mentorshipbookings', docs: 0 },
  ],

  cloudinaryFolders: [
    'innovative-hub/products',
    'innovative-hub/editor',
    'innovative-hub/avatars',
    'innovative-hub/invoices',
    'innovative-hub/offline-bills',
  ],
};

export const SOURCE_URIS = {
  OLD: () => process.env.OLD_MONGODB_URI,
  CURRENT: () => process.env.CURRENT_MONGODB_URI || process.env.MONGODB_URI,
  FINAL: () => process.env.FINAL_MONGODB_URI,
};
