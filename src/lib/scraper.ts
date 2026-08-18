import type { Platform } from './types';
import { getPlatformCookie } from './db';

/**
 * 价格抓取引擎 - 基于浏览器 Cookie 的真实抓取
 * 
 * 使用方式：
 * 1. 用户在浏览器登录淘宝/京东/唯品会
 * 2. F12 → Network → 复制请求头中的 Cookie
 * 3. 粘贴到系统设置页面的 Cookie 输入框
 * 4. 系统带着 Cookie 去请求真实价格
 */

interface PriceResult {
  success: boolean;
  price: number;
  originalPrice: number;
  discount: number;
  couponDiscount: number;
  promotionDiscount: number;
  finalPrice: number;
  productName?: string;
  imageUrl?: string;
  error?: string;
  source: 'real' | 'mock';
}

/**
 * 解析 Cookie 字符串为键值对
 */
function parseCookieString(cookieStr: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieStr.split(';').forEach(pair => {
    const [key, ...rest] = pair.trim().split('=');
    if (key) {
      cookies[key.trim()] = rest.join('=').trim();
    }
  });
  return cookies;
}

/**
 * 京东价格抓取
 * 使用京东价格 API：https://p.3.cn/prices/mgets?skuIds=J_xxx
 */
async function fetchJDPrice(productId: string, cookie: string): Promise<PriceResult | null> {
  try {
    const url = `https://p.3.cn/prices/mgets?skuIds=J_${productId}`;
    const response = await fetch(url, {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://item.jd.com/',
      },
    });

    if (!response.ok) return null;

    const data = await response.json() as Array<{ p: string; m: string; id: string }>;
    if (!data || data.length === 0) return null;

    const price = parseFloat(data[0].p);
    const originalPrice = parseFloat(data[0].m) || price;

    if (isNaN(price) || price <= 0) return null;

    return {
      success: true,
      price,
      originalPrice,
      discount: 0,
      couponDiscount: 0,
      promotionDiscount: 0,
      finalPrice: price,
      source: 'real',
    };
  } catch {
    return null;
  }
}

/**
 * 淘宝价格抓取
 * 通过商品详情页获取价格
 */
async function fetchTaobaoPrice(productId: string, cookie: string): Promise<PriceResult | null> {
  try {
    const url = `https://item.taobao.com/item.htm?id=${productId}`;
    const response = await fetch(url, {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.taobao.com/',
      },
      redirect: 'follow',
    });

    if (!response.ok) return null;

    const html = await response.text();

    // 尝试从页面中提取价格
    // 方式1: __INIT_DATA 中的 price
    const priceMatch = html.match(/"price"\s*:\s*"(\d+\.?\d*)"/) || html.match(/"reservePrice"\s*:\s*"(\d+\.?\d*)"/);
    // 方式2: g_config 中的价格
    const configMatch = html.match(/g_config\s*=\s*\{[^}]*"price"\s*:\s*"(\d+\.?\d*)"/);

    const priceStr = priceMatch?.[1] || configMatch?.[1];
    if (!priceStr) return null;

    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) return null;

    // 尝试提取原价
    const originalMatch = html.match(/"originalPrice"\s*:\s*"(\d+\.?\d*)"/);
    const originalPrice = originalMatch ? parseFloat(originalMatch[1]) : price;

    return {
      success: true,
      price,
      originalPrice: originalPrice || price,
      discount: 0,
      couponDiscount: 0,
      promotionDiscount: 0,
      finalPrice: price,
      source: 'real',
    };
  } catch {
    return null;
  }
}

/**
 * 唯品会价格抓取
 */
async function fetchVipshopPrice(productId: string, cookie: string): Promise<PriceResult | null> {
  try {
    const url = `https://mapi.vip.com/vips-mobile/rest/shopping/pc/product/detail/v2?app_name=shop_pc&app_version=4.0&warehouse=VIP_SH&app_channel=pc&mobile_platform=android&province_id=0&api_key=70f71280d5d547b2a7bb370a529aeea1&user_id=&mars_cid=&wap_consumer=a&productId=${productId}`;
    const response = await fetch(url, {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.vip.com/',
      },
    });

    if (!response.ok) return null;

    const data = await response.json() as { data?: { productDetail?: { salePrice?: string; marketPrice?: string } } };
    if (!data?.data?.productDetail) return null;

    const price = parseFloat(data.data.productDetail.salePrice || '');
    const originalPrice = parseFloat(data.data.productDetail.marketPrice || '') || price;

    if (isNaN(price) || price <= 0) return null;

    return {
      success: true,
      price,
      originalPrice,
      discount: 0,
      couponDiscount: 0,
      promotionDiscount: 0,
      finalPrice: price,
      source: 'real',
    };
  } catch {
    return null;
  }
}

/**
 * 模拟价格（当真实抓取失败时的降级方案）
 */
function getMockPrice(productId: string, platform: Platform): PriceResult {
  const hash = productId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const basePrice = 50 + (hash % 950);
  const fluctuation = 1 + (Math.random() - 0.5) * 0.3;
  const price = Math.round(basePrice * fluctuation * 100) / 100;
  const discountRate = Math.random() * 0.2;
  const discount = Math.round(price * discountRate * 100) / 100;
  const couponDiscount = Math.random() > 0.5 ? Math.round((Math.random() * 20 + 5) * 100) / 100 : 0;
  const promotionDiscount = Math.random() > 0.7 ? Math.round((Math.random() * 30 + 10) * 100) / 100 : 0;
  const finalPrice = Math.max(0.01, price - discount - couponDiscount - promotionDiscount);

  return {
    success: true,
    price: Math.round(price * 100) / 100,
    originalPrice: Math.round(basePrice * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    couponDiscount: Math.round(couponDiscount * 100) / 100,
    promotionDiscount: Math.round(promotionDiscount * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100,
    source: 'mock',
  };
}

/**
 * 抓取商品价格（优先真实抓取，失败则降级到模拟）
 */
export async function fetchProductPrice(
  productId: string,
  platform: Platform,
  url: string
): Promise<PriceResult> {
  // 尝试获取该平台的 Cookie
  const cookieData = getPlatformCookie(platform);

  if (cookieData?.cookie) {
    // 有 Cookie，尝试真实抓取
    let result: PriceResult | null = null;

    switch (platform) {
      case 'jd':
        result = await fetchJDPrice(productId, cookieData.cookie);
        break;
      case 'taobao':
        result = await fetchTaobaoPrice(productId, cookieData.cookie);
        break;
      case 'vipshop':
        result = await fetchVipshopPrice(productId, cookieData.cookie);
        break;
    }

    if (result?.success) {
      console.log(`[Scraper] ${platform} 真实价格抓取成功: ¥${result.finalPrice}`);
      return result;
    }

    if (result === null) {
      console.log(`[Scraper] ${platform} 真实抓取失败，使用模拟数据`);
    } else {
      console.log(`[Scraper] ${platform} 真实抓取返回异常: ${result.error}`);
    }
  } else {
    console.log(`[Scraper] ${platform} 未配置 Cookie，使用模拟数据`);
  }

  // 降级到模拟数据
  return getMockPrice(productId, platform);
}

/**
 * 批量抓取价格
 */
export async function fetchMultiplePrices(
  items: Array<{ productId: string; platform: Platform; url: string }>
): Promise<Map<string, PriceResult>> {
  const results = new Map<string, PriceResult>();

  for (const item of items) {
    const result = await fetchProductPrice(item.productId, item.platform, item.url);
    results.set(item.productId, result);
    // 请求间隔，避免触发反爬
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  }

  return results;
}
