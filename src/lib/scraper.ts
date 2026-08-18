import type { Platform } from './types';

/**
 * 价格抓取引擎
 * 
 * 注意：淘宝、京东、唯品会等平台有严格的反爬机制，
 * 真实的商品抓取需要：登录态 Cookie、签名算法、验证码处理等。
 * 
 * 当前实现为模拟引擎，返回基于真实价格波动的模拟数据。
 * 接入真实爬虫时，只需实现 fetchRealPrice 函数即可。
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
}

// 模拟基础价格库（用于演示）
const MOCK_BASE_PRICES: Record<string, number> = {};

function getBasePrice(productId: string, platform: Platform): number {
  const key = `${platform}_${productId}`;
  if (!MOCK_BASE_PRICES[key]) {
    // 基于商品 ID 生成一个稳定的基础价格
    const hash = productId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    MOCK_BASE_PRICES[key] = 50 + (hash % 950); // 50-999 之间
  }
  return MOCK_BASE_PRICES[key];
}

// 模拟价格波动
function simulatePriceFluctuation(basePrice: number): {
  price: number;
  discount: number;
  couponDiscount: number;
  promotionDiscount: number;
} {
  // 随机波动 ±15%
  const fluctuation = 1 + (Math.random() - 0.5) * 0.3;
  const price = Math.round(basePrice * fluctuation * 100) / 100;

  // 模拟各种优惠
  const discountRate = Math.random() * 0.2; // 0-20% 折扣
  const discount = Math.round(price * discountRate * 100) / 100;
  const couponDiscount = Math.random() > 0.5 ? Math.round((Math.random() * 20 + 5) * 100) / 100 : 0;
  const promotionDiscount = Math.random() > 0.7 ? Math.round((Math.random() * 30 + 10) * 100) / 100 : 0;

  return { price, discount, couponDiscount, promotionDiscount };
}

/**
 * 抓取商品价格
 * @param productId 商品 ID
 * @param platform 平台
 * @param url 商品链接
 */
export async function fetchProductPrice(
  productId: string,
  platform: Platform,
  url: string
): Promise<PriceResult> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

  try {
    const basePrice = getBasePrice(productId, platform);
    const { price, discount, couponDiscount, promotionDiscount } = simulatePriceFluctuation(basePrice);
    const finalPrice = Math.max(0.01, price - discount - couponDiscount - promotionDiscount);

    const platformNames: Record<Platform, string> = {
      taobao: '淘宝',
      jd: '京东',
      vipshop: '唯品会',
    };

    return {
      success: true,
      price: Math.round(price * 100) / 100,
      originalPrice: Math.round(basePrice * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      couponDiscount: Math.round(couponDiscount * 100) / 100,
      promotionDiscount: Math.round(promotionDiscount * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100,
      productName: `${platformNames[platform]}商品-${productId.slice(0, 8)}`,
      imageUrl: '',
    };
  } catch (error) {
    return {
      success: false,
      price: 0,
      originalPrice: 0,
      discount: 0,
      couponDiscount: 0,
      promotionDiscount: 0,
      finalPrice: 0,
      error: (error as Error).message,
    };
  }
}

/**
 * 批量抓取价格
 */
export async function fetchMultiplePrices(
  items: Array<{ productId: string; platform: Platform; url: string }>
): Promise<Map<string, PriceResult>> {
  const results = new Map<string, PriceResult>();

  // 串行抓取，避免触发反爬
  for (const item of items) {
    const result = await fetchProductPrice(item.productId, item.platform, item.url);
    results.set(item.productId, result);
    // 请求间隔
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  }

  return results;
}
