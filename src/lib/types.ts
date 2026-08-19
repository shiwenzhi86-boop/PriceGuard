// 平台枚举
export type Platform = 'taobao' | 'jd' | 'vipshop';

// 监控状态
export type MonitorStatus = 'active' | 'target_reached' | 'error' | 'paused';

// 商品
export interface Product {
  id: string;
  name: string;
  platform: Platform;
  url: string;
  productId: string;
  targetPrice: number;
  currentPrice: number | null;
  originalPrice: number | null;
  imageUrl: string | null;
  status: MonitorStatus;
  checkInterval: number; // 检查间隔（分钟）
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// 价格记录
export interface PriceRecord {
  id: string;
  productId: string;
  price: number;
  originalPrice: number | null;
  discount: number | null;
  couponDiscount: number | null;
  promotionDiscount: number | null;
  finalPrice: number;
  checkedAt: string;
}

// 通知记录
export interface NotificationRecord {
  id: string;
  productId: string;
  type: 'price_reached' | 'price_drop' | 'price_rise' | 'error';
  message: string;
  currentPrice: number;
  targetPrice: number;
  sentAt: string;
  success: boolean;
}

// 邮件配置
export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  toEmail: string;
  enabled: boolean;
}

// 企业微信配置
export interface WechatConfig {
  webhookUrl: string;
  enabled: boolean;
}

// 平台 Cookie
export interface PlatformCookie {
  platform: Platform;
  cookie: string;
  updatedAt: string;
}

// 价格抓取结果
export interface PriceResult {
  price?: number;
  originalPrice?: number | null;
  discount?: number | null;
  couponDiscount?: number | null;
  promotionDiscount?: number | null;
  finalPrice?: number;
  success: boolean;
  source?: 'real' | 'simulated';
  error?: string;
}

// 系统配置
export interface SystemConfig {
  id: string;
  defaultCheckInterval: number; // 默认检查间隔（分钟）
  maxProducts: number;
  emailConfig: EmailConfig;
  wechatConfig: WechatConfig;
  updatedAt: string;
}

// 平台信息
export const PLATFORM_INFO: Record<Platform, { name: string; color: string; icon: string; domain: string }> = {
  taobao: { name: '淘宝', color: '#FF5000', icon: '🛒', domain: 'taobao.com' },
  jd: { name: '京东', color: '#E1251B', icon: '🏬', domain: 'jd.com' },
  vipshop: { name: '唯品会', color: '#FF0066', icon: '🏷️', domain: 'vip.com' },
};

// 从 URL 识别平台
export function detectPlatform(url: string): Platform | null {
  if (url.includes('taobao.com') || url.includes('tmall.com') || url.includes('tb.cn')) return 'taobao';
  if (url.includes('jd.com') || url.includes('jd.cn') || url.includes('3.cn')) return 'jd';
  if (url.includes('vip.com') || url.includes('vipshop')) return 'vipshop';
  return null;
}

// 从 URL 提取商品 ID
export function extractProductId(url: string, platform: Platform): string {
  switch (platform) {
    case 'taobao': {
      const match = url.match(/id=(\d+)/);
      return match?.[1] || '';
    }
    case 'jd': {
      const match = url.match(/\/(\d+)\.html/);
      return match?.[1] || '';
    }
    case 'vipshop': {
      const match = url.match(/\/(\d+)\.html/) || url.match(/detail\/(\d+)/);
      return match?.[1] || '';
    }
    default:
      return '';
  }
}
