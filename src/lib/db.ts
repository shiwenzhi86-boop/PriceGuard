import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Product, PriceRecord, NotificationRecord, SystemConfig, EmailConfig, WechatConfig, MonitorStatus, Platform, PlatformCookie } from './types';

const DB_PATH = path.join(process.env.COZE_WORKSPACE_PATH || '/workspace/projects', 'data', 'price_monitor.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    // 确保目录存在
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initTables(db);
  }
  return db;
}

function initTables(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      platform TEXT NOT NULL CHECK(platform IN ('taobao', 'jd', 'vipshop')),
      url TEXT NOT NULL,
      product_id TEXT NOT NULL DEFAULT '',
      target_price REAL NOT NULL,
      current_price REAL,
      original_price REAL,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'target_reached', 'error', 'paused')),
      check_interval INTEGER NOT NULL DEFAULT 60,
      last_checked_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS price_records (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      price REAL NOT NULL,
      original_price REAL,
      discount REAL,
      coupon_discount REAL,
      promotion_discount REAL,
      final_price REAL NOT NULL,
      checked_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notification_records (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('price_reached', 'price_drop', 'price_rise', 'error')),
      message TEXT NOT NULL,
      current_price REAL NOT NULL,
      target_price REAL NOT NULL,
      sent_at TEXT NOT NULL DEFAULT (datetime('now')),
      success INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS system_config (
      id TEXT PRIMARY KEY DEFAULT 'default',
      default_check_interval INTEGER NOT NULL DEFAULT 60,
      max_products INTEGER NOT NULL DEFAULT 50,
      smtp_host TEXT NOT NULL DEFAULT '',
      smtp_port INTEGER NOT NULL DEFAULT 465,
      smtp_user TEXT NOT NULL DEFAULT '',
      smtp_pass TEXT NOT NULL DEFAULT '',
      from_email TEXT NOT NULL DEFAULT '',
      to_email TEXT NOT NULL DEFAULT '',
      email_enabled INTEGER NOT NULL DEFAULT 0,
      wechat_webhook_url TEXT NOT NULL DEFAULT '',
      wechat_enabled INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS platform_cookies (
      platform TEXT PRIMARY KEY CHECK(platform IN ('taobao', 'jd', 'vipshop')),
      cookie TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_price_records_product_id ON price_records(product_id);
    CREATE INDEX IF NOT EXISTS idx_price_records_checked_at ON price_records(checked_at);
    CREATE INDEX IF NOT EXISTS idx_notification_records_product_id ON notification_records(product_id);
  `);

  // 迁移：为已存在的 system_config 表添加 wechat 字段
  try {
    database.exec(`
      ALTER TABLE system_config ADD COLUMN wechat_webhook_url TEXT NOT NULL DEFAULT '';
      ALTER TABLE system_config ADD COLUMN wechat_enabled INTEGER NOT NULL DEFAULT 0;
    `);
  } catch {
    // 字段已存在，忽略
  }

  // 初始化默认配置
  const config = database.prepare('SELECT id FROM system_config WHERE id = ?').get('default');
  if (!config) {
    database.prepare(`
      INSERT INTO system_config (id, default_check_interval, max_products)
      VALUES ('default', 60, 50)
    `).run();
  }
}

// ============ Product CRUD ============

export function getAllProducts(): Product[] {
  const rows = getDb().prepare('SELECT * FROM products ORDER BY created_at DESC').all() as Record<string, unknown>[];
  return rows.map(mapProduct);
}

export function getProduct(id: string): Product | null {
  const row = getDb().prepare('SELECT * FROM products WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? mapProduct(row) : null;
}

export function createProduct(data: {
  name: string;
  platform: string;
  url: string;
  productId: string;
  targetPrice: number;
  imageUrl?: string;
  checkInterval?: number;
}): Product {
  const id = uuidv4();
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO products (id, name, platform, url, product_id, target_price, image_url, check_interval, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.platform, data.url, data.productId, data.targetPrice, data.imageUrl || null, data.checkInterval || 60, now, now);
  return getProduct(id)!;
}

export function updateProduct(id: string, data: Partial<{
  name: string;
  url: string;
  targetPrice: number;
  status: MonitorStatus;
  checkInterval: number;
  currentPrice: number | null;
  originalPrice: number | null;
  imageUrl: string | null;
  lastCheckedAt: string | null;
}>): Product | null {
  const fields: string[] = [];
  const values: unknown[] = [];

  const fieldMap: Record<string, string> = {
    name: 'name',
    url: 'url',
    targetPrice: 'target_price',
    status: 'status',
    checkInterval: 'check_interval',
    currentPrice: 'current_price',
    originalPrice: 'original_price',
    imageUrl: 'image_url',
    lastCheckedAt: 'last_checked_at',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in data) {
      fields.push(`${col} = ?`);
      values.push((data as Record<string, unknown>)[key]);
    }
  }

  if (fields.length === 0) return getProduct(id);

  fields.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  getDb().prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getProduct(id);
}

export function deleteProduct(id: string): boolean {
  const result = getDb().prepare('DELETE FROM products WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getProductCount(): number {
  const row = getDb().prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  return row.count;
}

// ============ Price Records ============

export function addPriceRecord(data: {
  productId: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  couponDiscount?: number;
  promotionDiscount?: number;
  finalPrice: number;
}): PriceRecord {
  const id = uuidv4();
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO price_records (id, product_id, price, original_price, discount, coupon_discount, promotion_discount, final_price, checked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.productId, data.price, data.originalPrice || null, data.discount || null, data.couponDiscount || null, data.promotionDiscount || null, data.finalPrice, now);

  // 同时更新商品的当前价格
  updateProduct(data.productId, {
    currentPrice: data.finalPrice,
    originalPrice: data.originalPrice || null,
    lastCheckedAt: now,
  });

  return getPriceRecord(id)!;
}

export function getPriceRecord(id: string): PriceRecord | null {
  const row = getDb().prepare('SELECT * FROM price_records WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? mapPriceRecord(row) : null;
}

export function getPriceHistory(productId: string, limit = 30): PriceRecord[] {
  const rows = getDb().prepare(
    'SELECT * FROM price_records WHERE product_id = ? ORDER BY checked_at DESC LIMIT ?'
  ).all(productId, limit) as Record<string, unknown>[];
  return rows.map(mapPriceRecord);
}

// ============ Notification Records ============

export function addNotificationRecord(data: {
  productId: string;
  type: 'price_reached' | 'price_drop' | 'price_rise' | 'error';
  message: string;
  currentPrice: number;
  targetPrice: number;
  success: boolean;
}): NotificationRecord {
  const id = uuidv4();
  getDb().prepare(`
    INSERT INTO notification_records (id, product_id, type, message, current_price, target_price, success)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.productId, data.type, data.message, data.currentPrice, data.targetPrice, data.success ? 1 : 0);
  return getNotificationRecord(id)!;
}

export function getNotificationRecord(id: string): NotificationRecord | null {
  const row = getDb().prepare('SELECT * FROM notification_records WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? mapNotificationRecord(row) : null;
}

export function getNotifications(limit = 50): NotificationRecord[] {
  const rows = getDb().prepare(
    'SELECT * FROM notification_records ORDER BY sent_at DESC LIMIT ?'
  ).all(limit) as Record<string, unknown>[];
  return rows.map(mapNotificationRecord);
}

// ============ System Config ============

export function getSystemConfig(): SystemConfig {
  const row = getDb().prepare('SELECT * FROM system_config WHERE id = ?').get('default') as Record<string, unknown>;
  return mapSystemConfig(row);
}

export function updateSystemConfig(data: Partial<{
  defaultCheckInterval: number;
  maxProducts: number;
  emailConfig: EmailConfig;
  wechatConfig: WechatConfig;
}>): SystemConfig {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.defaultCheckInterval !== undefined) {
    fields.push('default_check_interval = ?');
    values.push(data.defaultCheckInterval);
  }
  if (data.maxProducts !== undefined) {
    fields.push('max_products = ?');
    values.push(data.maxProducts);
  }
  if (data.emailConfig) {
    fields.push('smtp_host = ?', 'smtp_port = ?', 'smtp_user = ?', 'smtp_pass = ?', 'from_email = ?', 'to_email = ?', 'email_enabled = ?');
    values.push(
      data.emailConfig.smtpHost,
      data.emailConfig.smtpPort,
      data.emailConfig.smtpUser,
      data.emailConfig.smtpPass,
      data.emailConfig.fromEmail,
      data.emailConfig.toEmail,
      data.emailConfig.enabled ? 1 : 0
    );
  }
  if (data.wechatConfig) {
    fields.push('wechat_webhook_url = ?', 'wechat_enabled = ?');
    values.push(
      data.wechatConfig.webhookUrl,
      data.wechatConfig.enabled ? 1 : 0
    );
  }

  if (fields.length > 0) {
    fields.push("updated_at = ?");
    values.push(new Date().toISOString());
    getDb().prepare(`UPDATE system_config SET ${fields.join(', ')} WHERE id = 'default'`).run(...values);
  }

  return getSystemConfig();
}

// ============ Platform Cookies ============

export function getPlatformCookie(platform: Platform): PlatformCookie | null {
  const row = getDb().prepare('SELECT * FROM platform_cookies WHERE platform = ?').get(platform) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    platform: row.platform as Platform,
    cookie: row.cookie as string,
    updatedAt: row.updated_at as string,
  };
}

export function getAllPlatformCookies(): PlatformCookie[] {
  const rows = getDb().prepare('SELECT * FROM platform_cookies').all() as Record<string, unknown>[];
  return rows.map(row => ({
    platform: row.platform as Platform,
    cookie: row.cookie as string,
    updatedAt: row.updated_at as string,
  }));
}

export function savePlatformCookie(platform: Platform, cookie: string): PlatformCookie {
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO platform_cookies (platform, cookie, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(platform) DO UPDATE SET cookie = ?, updated_at = ?
  `).run(platform, cookie, now, cookie, now);
  return { platform, cookie, updatedAt: now };
}

export function deletePlatformCookie(platform: Platform): boolean {
  const result = getDb().prepare('DELETE FROM platform_cookies WHERE platform = ?').run(platform);
  return result.changes > 0;
}

// ============ Mapper Functions ============

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    name: row.name as string,
    platform: row.platform as Product['platform'],
    url: row.url as string,
    productId: row.product_id as string,
    targetPrice: row.target_price as number,
    currentPrice: row.current_price as number | null,
    originalPrice: row.original_price as number | null,
    imageUrl: row.image_url as string | null,
    status: row.status as MonitorStatus,
    checkInterval: row.check_interval as number,
    lastCheckedAt: row.last_checked_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapPriceRecord(row: Record<string, unknown>): PriceRecord {
  return {
    id: row.id as string,
    productId: row.product_id as string,
    price: row.price as number,
    originalPrice: row.original_price as number | null,
    discount: row.discount as number | null,
    couponDiscount: row.coupon_discount as number | null,
    promotionDiscount: row.promotion_discount as number | null,
    finalPrice: row.final_price as number,
    checkedAt: row.checked_at as string,
  };
}

function mapNotificationRecord(row: Record<string, unknown>): NotificationRecord {
  return {
    id: row.id as string,
    productId: row.product_id as string,
    type: row.type as NotificationRecord['type'],
    message: row.message as string,
    currentPrice: row.current_price as number,
    targetPrice: row.target_price as number,
    sentAt: row.sent_at as string,
    success: (row.success as number) === 1,
  };
}

function mapSystemConfig(row: Record<string, unknown>): SystemConfig {
  return {
    id: row.id as string,
    defaultCheckInterval: row.default_check_interval as number,
    maxProducts: row.max_products as number,
    emailConfig: {
      smtpHost: row.smtp_host as string,
      smtpPort: row.smtp_port as number,
      smtpUser: row.smtp_user as string,
      smtpPass: row.smtp_pass as string,
      fromEmail: row.from_email as string,
      toEmail: row.to_email as string,
      enabled: (row.email_enabled as number) === 1,
    },
    wechatConfig: {
      webhookUrl: (row.wechat_webhook_url as string) || '',
      enabled: (row.wechat_enabled as number) === 1,
    },
    updatedAt: row.updated_at as string,
  };
}
