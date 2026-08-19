import { createClient, type Client } from '@libsql/client';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Product, PriceRecord, NotificationRecord, SystemConfig, EmailConfig, WechatConfig, MonitorStatus, Platform, PlatformCookie } from './types';

const DB_PATH = path.join(process.env.COZE_WORKSPACE_PATH || '/workspace/projects', 'data', 'price_monitor.db');

let db: Client | null = null;

async function getDb(): Promise<Client> {
  if (!db) {
    const fs = await import('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = createClient({ url: `file:${DB_PATH}` });
    await initTables(db);
  }
  return db;
}

async function initTables(database: Client) {
  await database.execute(`
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
  `);

  await database.execute(`
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
  `);

  await database.execute(`
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
  `);

  await database.execute(`
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
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS platform_cookies (
      platform TEXT PRIMARY KEY CHECK(platform IN ('taobao', 'jd', 'vipshop')),
      cookie TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await database.execute(`CREATE INDEX IF NOT EXISTS idx_price_records_product_id ON price_records(product_id);`);
  await database.execute(`CREATE INDEX IF NOT EXISTS idx_price_records_checked_at ON price_records(checked_at);`);
  await database.execute(`CREATE INDEX IF NOT EXISTS idx_notification_records_product_id ON notification_records(product_id);`);

  // 迁移：为已存在的 system_config 表添加 wechat 字段
  try {
    await database.execute(`ALTER TABLE system_config ADD COLUMN wechat_webhook_url TEXT NOT NULL DEFAULT ''`);
    await database.execute(`ALTER TABLE system_config ADD COLUMN wechat_enabled INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // 字段已存在，忽略
  }

  // 初始化默认配置
  const config = await database.execute({ sql: 'SELECT id FROM system_config WHERE id = ?', args: ['default'] });
  if (config.rows.length === 0) {
    await database.execute({
      sql: `INSERT INTO system_config (id, default_check_interval, max_products) VALUES ('default', 60, 50)`,
      args: [],
    });
  }
}

// ============ Product CRUD ============

export async function getAllProducts(): Promise<Product[]> {
  const result = await (await getDb()).execute('SELECT * FROM products ORDER BY created_at DESC');
  return result.rows.map(mapProduct);
}

export async function getProduct(id: string): Promise<Product | null> {
  const result = await (await getDb()).execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [id] });
  return result.rows.length > 0 ? mapProduct(result.rows[0]) : null;
}

export async function createProduct(data: {
  name: string;
  platform: string;
  url: string;
  productId: string;
  targetPrice: number;
  imageUrl?: string;
  checkInterval?: number;
}): Promise<Product> {
  const id = uuidv4();
  const now = new Date().toISOString();
  await (await getDb()).execute({
    sql: `INSERT INTO products (id, name, platform, url, product_id, target_price, image_url, check_interval, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, data.name, data.platform, data.url, data.productId, data.targetPrice, data.imageUrl || null, data.checkInterval || 60, now, now],
  });
  return (await getProduct(id))!;
}

export async function updateProduct(id: string, data: Partial<{
  name: string;
  url: string;
  targetPrice: number;
  status: MonitorStatus;
  checkInterval: number;
  currentPrice: number | null;
  originalPrice: number | null;
  imageUrl: string | null;
  lastCheckedAt: string | null;
}>): Promise<Product | null> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

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
      values.push((data as Record<string, unknown>)[key] as string | number | null);
    }
  }

  if (fields.length === 0) return getProduct(id);

  fields.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  await (await getDb()).execute({
    sql: `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
    args: values,
  });
  return getProduct(id);
}

export async function deleteProduct(id: string): Promise<boolean> {
  const result = await (await getDb()).execute({ sql: 'DELETE FROM products WHERE id = ?', args: [id] });
  return result.rowsAffected > 0;
}

export async function getProductCount(): Promise<number> {
  const result = await (await getDb()).execute('SELECT COUNT(*) as count FROM products');
  return Number(result.rows[0]?.['count'] ?? 0);
}

// ============ Price Records ============

export async function addPriceRecord(data: {
  productId: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  couponDiscount?: number;
  promotionDiscount?: number;
  finalPrice: number;
}): Promise<PriceRecord> {
  const id = uuidv4();
  const now = new Date().toISOString();
  await (await getDb()).execute({
    sql: `INSERT INTO price_records (id, product_id, price, original_price, discount, coupon_discount, promotion_discount, final_price, checked_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, data.productId, data.price, data.originalPrice || null, data.discount || null, data.couponDiscount || null, data.promotionDiscount || null, data.finalPrice, now],
  });

  // 同时更新商品的当前价格
  await updateProduct(data.productId, {
    currentPrice: data.finalPrice,
    originalPrice: data.originalPrice || null,
    lastCheckedAt: now,
  });

  return (await getPriceRecord(id))!;
}

export async function getPriceRecord(id: string): Promise<PriceRecord | null> {
  const result = await (await getDb()).execute({ sql: 'SELECT * FROM price_records WHERE id = ?', args: [id] });
  return result.rows.length > 0 ? mapPriceRecord(result.rows[0]) : null;
}

export async function getPriceHistory(productId: string, limit = 30): Promise<PriceRecord[]> {
  const result = await (await getDb()).execute({
    sql: 'SELECT * FROM price_records WHERE product_id = ? ORDER BY checked_at DESC LIMIT ?',
    args: [productId, limit],
  });
  return result.rows.map(mapPriceRecord);
}

// ============ Notification Records ============

export async function addNotificationRecord(data: {
  productId: string;
  type: 'price_reached' | 'price_drop' | 'price_rise' | 'error';
  message: string;
  currentPrice: number;
  targetPrice: number;
  success: boolean;
}): Promise<NotificationRecord> {
  const id = uuidv4();
  await (await getDb()).execute({
    sql: `INSERT INTO notification_records (id, product_id, type, message, current_price, target_price, success)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, data.productId, data.type, data.message, data.currentPrice, data.targetPrice, data.success ? 1 : 0],
  });
  return (await getNotificationRecord(id))!;
}

export async function getNotificationRecord(id: string): Promise<NotificationRecord | null> {
  const result = await (await getDb()).execute({ sql: 'SELECT * FROM notification_records WHERE id = ?', args: [id] });
  return result.rows.length > 0 ? mapNotificationRecord(result.rows[0]) : null;
}

export async function getNotifications(limit = 50): Promise<NotificationRecord[]> {
  const result = await (await getDb()).execute({
    sql: 'SELECT * FROM notification_records ORDER BY sent_at DESC LIMIT ?',
    args: [limit],
  });
  return result.rows.map(mapNotificationRecord);
}

// ============ System Config ============

export async function getSystemConfig(): Promise<SystemConfig> {
  const result = await (await getDb()).execute({ sql: 'SELECT * FROM system_config WHERE id = ?', args: ['default'] });
  return mapSystemConfig(result.rows[0]);
}

export async function updateSystemConfig(data: Partial<{
  defaultCheckInterval: number;
  maxProducts: number;
  emailConfig: EmailConfig;
  wechatConfig: WechatConfig;
}>): Promise<SystemConfig> {
  const fields: string[] = [];
  const values: (string | number)[] = [];

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
    await (await getDb()).execute({
      sql: `UPDATE system_config SET ${fields.join(', ')} WHERE id = 'default'`,
      args: values,
    });
  }

  return getSystemConfig();
}

// ============ Platform Cookies ============

export async function getPlatformCookie(platform: Platform): Promise<PlatformCookie | null> {
  const result = await (await getDb()).execute({ sql: 'SELECT * FROM platform_cookies WHERE platform = ?', args: [platform] });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    platform: row.platform as Platform,
    cookie: row.cookie as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getAllPlatformCookies(): Promise<PlatformCookie[]> {
  const result = await (await getDb()).execute('SELECT * FROM platform_cookies');
  return result.rows.map(row => ({
    platform: row.platform as Platform,
    cookie: row.cookie as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function savePlatformCookie(platform: Platform, cookie: string): Promise<PlatformCookie> {
  const now = new Date().toISOString();
  await (await getDb()).execute({
    sql: `INSERT INTO platform_cookies (platform, cookie, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(platform) DO UPDATE SET cookie = ?, updated_at = ?`,
    args: [platform, cookie, now, cookie, now],
  });
  return { platform, cookie, updatedAt: now };
}

export async function deletePlatformCookie(platform: Platform): Promise<boolean> {
  const result = await (await getDb()).execute({ sql: 'DELETE FROM platform_cookies WHERE platform = ?', args: [platform] });
  return result.rowsAffected > 0;
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
    currentPrice: (row.current_price as number) ?? null,
    originalPrice: (row.original_price as number) ?? null,
    imageUrl: (row.image_url as string) ?? null,
    status: row.status as MonitorStatus,
    checkInterval: row.check_interval as number,
    lastCheckedAt: (row.last_checked_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapPriceRecord(row: Record<string, unknown>): PriceRecord {
  return {
    id: row.id as string,
    productId: row.product_id as string,
    price: row.price as number,
    originalPrice: (row.original_price as number) ?? null,
    discount: (row.discount as number) ?? null,
    couponDiscount: (row.coupon_discount as number) ?? null,
    promotionDiscount: (row.promotion_discount as number) ?? null,
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
