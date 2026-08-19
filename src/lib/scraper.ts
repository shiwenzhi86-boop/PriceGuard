import puppeteer, { type Browser, type Page } from 'puppeteer';
import path from 'path';
import fs from 'fs';
import type { Platform } from './types';

/**
 * 价格抓取引擎 - 基于 Puppeteer 真实浏览器抓取
 * 
 * 使用真实浏览器访问商品页面，提取实际显示的价格。
 * 支持京东、淘宝/天猫、唯品会。
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

// 浏览器用户数据目录（保存登录态）
const USER_DATA_DIR = path.join(process.cwd(), 'data', 'browser-profile');

// 确保用户数据目录存在
function ensureUserDataDir(): void {
  const dir = path.dirname(USER_DATA_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  }
}

// 全局浏览器实例（复用，避免每次启动）
let browserInstance: Browser | null = null;

/**
 * 获取或创建浏览器实例
 */
async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  ensureUserDataDir();

  browserInstance = await puppeteer.launch({
    headless: true,
    userDataDir: USER_DATA_DIR,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080',
    ],
    defaultViewport: { width: 1920, height: 1080 },
  });

  return browserInstance;
}

/**
 * 创建新页面并设置反检测
 */
async function createPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  
  // 设置 User-Agent
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // 注入反检测脚本
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
    (window as any).chrome = { runtime: {} };
  });

  return page;
}

/**
 * 京东价格抓取
 */
async function fetchJDPrice(productId: string): Promise<PriceResult> {
  const browser = await getBrowser();
  const page = await createPage(browser);

  try {
    // 方式1: 使用京东价格 API
    const apiUrl = `https://p.3.cn/prices/mgets?skuIds=J_${productId}`;
    const apiResponse = await page.goto(apiUrl, { waitUntil: 'networkidle0', timeout: 15000 });
    
    if (apiResponse?.ok()) {
      const content = await page.content();
      try {
        const data = JSON.parse(content);
        if (Array.isArray(data) && data.length > 0 && data[0].p) {
          const price = parseFloat(data[0].p);
          const originalPrice = parseFloat(data[0].m) || price;
          
          if (!isNaN(price) && price > 0) {
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
          }
        }
      } catch {
        // JSON 解析失败，继续尝试页面抓取
      }
    }

    // 方式2: 访问商品页面提取价格
    await page.goto(`https://item.jd.com/${productId}.html`, { 
      waitUntil: 'networkidle0', 
      timeout: 20000 
    });

    // 等待价格元素加载
    await page.waitForSelector('.p-price, .summary-price, .J-p-price', { timeout: 10000 }).catch(() => {});

    // 提取价格
    const priceText = await page.evaluate(() => {
      // 尝试多种选择器
      const selectors = [
        '.p-price .price',
        '.summary-price .price',
        '.J-p-price',
        '[data-price]',
        '.product-price .current',
      ];
      
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) {
          const text = el.textContent?.trim() || '';
          const match = text.match(/[\d.]+/);
          if (match) return match[0];
        }
      }
      
      // 尝试从页面脚本中提取
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const text = script.textContent || '';
        const match = text.match(/price\s*[:=]\s*["']?(\d+\.?\d*)/);
        if (match) return match[1];
      }
      
      return null;
    });

    if (priceText) {
      const price = parseFloat(priceText);
      if (!isNaN(price) && price > 0) {
        return {
          success: true,
          price,
          originalPrice: price,
          discount: 0,
          couponDiscount: 0,
          promotionDiscount: 0,
          finalPrice: price,
          source: 'real',
        };
      }
    }

    return {
      success: false,
      price: 0,
      originalPrice: 0,
      discount: 0,
      couponDiscount: 0,
      promotionDiscount: 0,
      finalPrice: 0,
      error: '未能从京东页面提取价格',
      source: 'real',
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
      error: error instanceof Error ? error.message : '未知错误',
      source: 'real',
    };
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * 淘宝/天猫价格抓取
 */
async function fetchTaobaoPrice(productId: string, url: string): Promise<PriceResult> {
  const browser = await getBrowser();
  const page = await createPage(browser);

  try {
    // 访问商品页面
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });

    // 等待价格元素加载
    await page.waitForSelector('.price-current, .tb-rmb-num, .Price--priceInt--Yxs, [data-spm-price]', { timeout: 10000 }).catch(() => {});

    // 额外等待以确保动态内容加载
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 提取价格
    const priceText = await page.evaluate(() => {
      const selectors = [
        '.price-current .Price--priceText--nv7',
        '.tb-rmb-num',
        '.Price--priceInt--Yxs',
        '[data-spm-price]',
        '.price .val',
        '.main-price .price',
      ];
      
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) {
          const text = el.textContent?.trim() || '';
          const match = text.match(/[\d.]+/);
          if (match) return match[0];
        }
      }
      
      // 尝试从页面脚本中提取
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const text = script.textContent || '';
        const match = text.match(/"price"\s*:\s*"(\d+\.?\d*)"/) || 
                      text.match(/reservePrice["\s:]+(\d+\.?\d*)/);
        if (match) return match[1];
      }
      
      return null;
    });

    if (priceText) {
      const price = parseFloat(priceText);
      if (!isNaN(price) && price > 0) {
        return {
          success: true,
          price,
          originalPrice: price,
          discount: 0,
          couponDiscount: 0,
          promotionDiscount: 0,
          finalPrice: price,
          source: 'real',
        };
      }
    }

    return {
      success: false,
      price: 0,
      originalPrice: 0,
      discount: 0,
      couponDiscount: 0,
      promotionDiscount: 0,
      finalPrice: 0,
      error: '未能从淘宝/天猫页面提取价格',
      source: 'real',
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
      error: error instanceof Error ? error.message : '未知错误',
      source: 'real',
    };
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * 唯品会价格抓取
 */
async function fetchVipshopPrice(productId: string, url: string): Promise<PriceResult> {
  const browser = await getBrowser();
  const page = await createPage(browser);

  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });

    // 等待价格元素加载
    await page.waitForSelector('.price-current, .product-price, .sale-price', { timeout: 10000 }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 2000));

    const priceText = await page.evaluate(() => {
      const selectors = [
        '.price-current .num',
        '.product-price .current',
        '.sale-price .value',
        '[class*="price"] [class*="num"]',
      ];
      
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) {
          const text = el.textContent?.trim() || '';
          const match = text.match(/[\d.]+/);
          if (match) return match[0];
        }
      }
      
      return null;
    });

    if (priceText) {
      const price = parseFloat(priceText);
      if (!isNaN(price) && price > 0) {
        return {
          success: true,
          price,
          originalPrice: price,
          discount: 0,
          couponDiscount: 0,
          promotionDiscount: 0,
          finalPrice: price,
          source: 'real',
        };
      }
    }

    return {
      success: false,
      price: 0,
      originalPrice: 0,
      discount: 0,
      couponDiscount: 0,
      promotionDiscount: 0,
      finalPrice: 0,
      error: '未能从唯品会页面提取价格',
      source: 'real',
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
      error: error instanceof Error ? error.message : '未知错误',
      source: 'real',
    };
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * 抓取商品价格（真实浏览器抓取，无模拟降级）
 */
export async function fetchProductPrice(
  productId: string,
  platform: Platform,
  url: string
): Promise<PriceResult> {
  console.log(`[Scraper] 开始抓取 ${platform} 商品 ${productId}...`);

  let result: PriceResult;

  switch (platform) {
    case 'jd':
      result = await fetchJDPrice(productId);
      break;
    case 'taobao':
      result = await fetchTaobaoPrice(productId, url);
      break;
    case 'vipshop':
      result = await fetchVipshopPrice(productId, url);
      break;
    default:
      result = {
        success: false,
        price: 0,
        originalPrice: 0,
        discount: 0,
        couponDiscount: 0,
        promotionDiscount: 0,
        finalPrice: 0,
        error: `不支持的平台: ${platform}`,
        source: 'real',
      };
  }

  if (result.success) {
    console.log(`[Scraper] ${platform} 价格抓取成功: ¥${result.finalPrice}`);
  } else {
    console.log(`[Scraper] ${platform} 价格抓取失败: ${result.error}`);
  }

  return result;
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
  }

  return results;
}

/**
 * 关闭浏览器（用于清理）
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
