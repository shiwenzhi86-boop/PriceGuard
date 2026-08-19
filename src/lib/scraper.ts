/**
 * 价格抓取引擎 - Puppeteer 真实浏览器抓取
 * 使用本地 Chrome 浏览器访问商品页面，提取真实价格
 */

import puppeteer, { type Browser, type Page } from 'puppeteer';
import path from 'path';
import fs from 'fs';
import type { Platform, PriceResult } from './types';

// 浏览器实例（复用）
let browserInstance: Browser | null = null;

// 浏览器配置文件目录（保存登录态）
const BROWSER_PROFILE_DIR = path.join(process.cwd(), 'data', 'browser-profile');

/**
 * 查找本地 Chrome 安装路径
 */
function findChromePath(): string | undefined {
  const paths = [
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

/**
 * 获取或创建浏览器实例
 * 使用本地 Chrome + 持久化用户数据目录（保存登录态）
 */
async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  // 确保配置文件目录存在
  if (!fs.existsSync(BROWSER_PROFILE_DIR)) {
    fs.mkdirSync(BROWSER_PROFILE_DIR, { recursive: true });
  }

  const chromePath = findChromePath();

  browserInstance = await puppeteer.launch({
    headless: true,
    executablePath: chromePath, // 使用本地 Chrome
    userDataDir: BROWSER_PROFILE_DIR, // 持久化登录态
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
    defaultViewport: { width: 1920, height: 1080 },
  });

  console.log('[Scraper] 浏览器已启动', chromePath ? `(Chrome: ${chromePath})` : '(使用内置 Chromium)');
  return browserInstance;
}

/**
 * 启动有头模式浏览器（用于首次登录）
 * 会弹出可见的 Chrome 窗口
 */
export async function launchLoginBrowser(platform: Platform = 'jd'): Promise<{ success: boolean; message: string }> {
  try {
    // 确保配置文件目录存在
    if (!fs.existsSync(BROWSER_PROFILE_DIR)) {
      fs.mkdirSync(BROWSER_PROFILE_DIR, { recursive: true });
    }

    const chromePath = findChromePath();
    
    if (!chromePath) {
      return {
        success: false,
        message: '未找到 Google Chrome 浏览器。请安装 Chrome 或检查安装路径。',
      };
    }

    console.log(`[Scraper] 找到 Chrome: ${chromePath}`);

    const browser = await puppeteer.launch({
      headless: false, // 有头模式，可以看到窗口
      executablePath: chromePath,
      userDataDir: BROWSER_PROFILE_DIR,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled', // 隐藏自动化特征
        '--window-size=1280,900',
      ],
      defaultViewport: { width: 1280, height: 900 },
    });

    const page = await browser.newPage();

    // 忽略 HTTPS 错误
    await page.setBypassCSP(true);

    // 反检测：隐藏 webdriver 特征
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
      (window as any).chrome = { runtime: {} };
    });

    // 设置真实的 User-Agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    // 根据平台打开对应的登录页
    const loginUrls: Record<Platform, string> = {
      jd: 'https://passport.jd.com/new/login.aspx',
      taobao: 'https://login.taobao.com/member/login.jhtml',
      vipshop: 'https://passport.vip.com/login?src=https://www.vip.com',
    };

    const platformNames: Record<Platform, string> = {
      jd: '京东',
      taobao: '淘宝/天猫',
      vipshop: '唯品会',
    };

    const loginUrl = loginUrls[platform];
    const platformName = platformNames[platform];

    console.log(`[Scraper] 正在打开 ${platformName} 登录页面：${loginUrl}`);

    await page.goto(loginUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    console.log(`[Scraper] 登录浏览器已打开，请在浏览器中登录${platformName}`);
    console.log('[Scraper] 登录完成后关闭浏览器窗口即可');

    // 监听浏览器关闭事件
    browser.on('disconnected', () => {
      console.log('[Scraper] 登录浏览器已关闭，登录态已保存');
      browserInstance = null;
    });

    return {
      success: true,
      message: `登录窗口已打开，请在浏览器中登录${platformName}。登录完成后关闭浏览器窗口即可。`,
    };
  } catch (error) {
    return {
      success: false,
      message: `启动登录浏览器失败: ${error instanceof Error ? error.message : '未知错误'}。请确保已安装 Google Chrome 浏览器。`,
    };
  }
}

/**
 * 创建新页面
 */
async function createPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
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
    // 京东价格 API
    const priceUrl = `https://p.3.cn/prices/mgets?skuIds=J_${productId}&type=1`;
    const response = await page.goto(priceUrl, { waitUntil: 'networkidle0', timeout: 15000 });

    if (!response) {
      return {
        success: false,
        price: 0,
        originalPrice: 0,
        discount: 0,
        couponDiscount: 0,
        promotionDiscount: 0,
        finalPrice: 0,
        error: '京东价格接口无响应',
        source: 'real',
      };
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        success: false,
        price: 0,
        originalPrice: 0,
        discount: 0,
        couponDiscount: 0,
        promotionDiscount: 0,
        finalPrice: 0,
        error: '京东价格接口返回格式错误',
        source: 'real',
      };
    }

    if (Array.isArray(data) && data.length > 0) {
      const item = data[0];
      const price = parseFloat(item.p);
      const originalPrice = parseFloat(item.m);

      if (!isNaN(price) && price > 0) {
        const discount = !isNaN(originalPrice) && originalPrice > price ? originalPrice - price : 0;
        return {
          success: true,
          price,
          originalPrice: !isNaN(originalPrice) ? originalPrice : price,
          discount,
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
      error: '京东价格接口未返回有效价格',
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
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });

    // 等待价格元素加载
    await page.waitForSelector('.price-current, .Price--priceInt--Yxs, [class*="price"]', { timeout: 10000 }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 2000));

    const priceText = await page.evaluate(() => {
      const selectors = [
        '.price-current .price-integer',
        '.Price--priceInt--Yxs',
        '[class*="price"] [class*="integer"]',
        '.tb-rmb-num',
        '[data-spm="price"]',
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
