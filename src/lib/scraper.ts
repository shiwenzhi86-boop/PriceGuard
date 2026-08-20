import puppeteer from 'puppeteer-extra';
import type { Browser, Page } from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { PriceResult, Platform, PlatformCookie } from './types';
import { detectPageStatus } from './page-detector';

// 使用 stealth 插件
puppeteer.use(StealthPlugin());

// 抓取配置
const FETCH_CONFIG = {
  minDelay: 5000,
  maxDelay: 12000,
  maxRetries: 2,
  retryDelay: 30000,
};

// 浏览器实例
let browser: Browser | null = null;
let loginBrowser: Browser | null = null;

// 查找 Chrome 路径
function findChromePath(): string | null {
  const paths = [
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe` : '',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ].filter(Boolean);

  for (const path of paths) {
    try {
      const fs = require('fs');
      if (fs.existsSync(path)) {
        return path;
      }
    } catch {}
  }
  return null;
}

// 获取浏览器实例
async function getBrowser(): Promise<Browser> {
  if (!browser) {
    const chromePath = findChromePath();
    console.log(`[Scraper] 找到 Chrome: ${chromePath || '使用默认路径'}`);
    
    browser = await puppeteer.launch({
      headless: true,
      executablePath: chromePath || undefined,
      userDataDir: './data/browser-profile',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ],
    });

    // 注入反检测脚本
    const pages = await browser.pages();
    for (const page of pages) {
      await injectStealthScripts(page);
    }

    browser.on('targetcreated', async (target: any) => {
      const newPage = await target.page();
      if (newPage) {
        await injectStealthScripts(newPage);
      }
    });

    console.log('[Scraper] 浏览器已启动');
  }
  return browser;
}

// 获取登录浏览器实例（有头模式）
async function getLoginBrowser(): Promise<Browser> {
  if (!loginBrowser) {
    const chromePath = findChromePath();
    
    loginBrowser = await puppeteer.launch({
      headless: false,
      executablePath: chromePath || undefined,
      userDataDir: './data/browser-profile',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ],
    });

    const pages = await loginBrowser.pages();
    for (const page of pages) {
      await injectStealthScripts(page);
    }

    console.log('[Scraper] 登录浏览器已启动（有头模式）');
  }
  return loginBrowser;
}

// 注入反检测脚本
async function injectStealthScripts(page: Page) {
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    (window as any).chrome = { runtime: {} };
  });
}

// 创建页面
async function createPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await injectStealthScripts(page);
  return page;
}

// 随机延迟
async function randomDelay() {
  const delay = Math.floor(Math.random() * (FETCH_CONFIG.maxDelay - FETCH_CONFIG.minDelay)) + FETCH_CONFIG.minDelay;
  console.log(`[Scraper] 等待 ${delay / 1000} 秒...`);
  await new Promise(resolve => setTimeout(resolve, delay));
}

// 模拟真人行为
async function simulateHumanBehavior(page: Page) {
  const scrollCount = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < scrollCount; i++) {
    await page.evaluate(() => {
      window.scrollBy(0, Math.floor(Math.random() * 200) + 100);
    });
    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000) + 1000));
  }
  
  await page.mouse.move(Math.floor(Math.random() * 800) + 100, Math.floor(Math.random() * 600) + 100);
  await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1000) + 500));
}

// 启动登录浏览器
export async function launchLoginBrowser(platform: Platform): Promise<{ success: boolean; message: string }> {
  try {
    const browser = await getLoginBrowser();
    const page = await createPage(browser);

    const loginUrls: Record<Platform, string> = {
      jd: 'https://passport.jd.com/new/login.aspx',
      taobao: 'https://login.taobao.com/member/login.jhtml',
      vipshop: 'https://passport.vip.com/login?src=https://www.vip.com',
    };

    const url = loginUrls[platform];
    console.log(`[Scraper] 正在打开 ${platform} 登录页面：${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    const platformNames: Record<Platform, string> = {
      jd: '京东',
      taobao: '淘宝',
      vipshop: '唯品会',
    };

    return {
      success: true,
      message: `已打开${platformNames[platform]}登录页面，请在浏览器中完成登录`,
    };
  } catch (error: any) {
    console.error('[Scraper] 启动登录浏览器失败:', error);
    return {
      success: false,
      message: `启动失败：${error.message}`,
    };
  }
}

// 京东价格抓取
async function fetchJDPrice(productId: string): Promise<PriceResult> {
  const browser = await getBrowser();
  const page = await createPage(browser);

  try {
    await randomDelay();

    const priceUrl = `https://p.3.cn/prices/mgets?skuIds=J_${productId}&type=1`;
    const response = await page.goto(priceUrl, { waitUntil: 'networkidle0', timeout: 15000 });

    const pageStatus = await detectPageStatus(page, 'jd');
    if (pageStatus.type !== 'NORMAL') {
      console.log(`[Scraper] 京东页面异常：${pageStatus.type} - ${pageStatus.message}`);
      return {
        success: false,
        price: 0,
        originalPrice: 0,
        discount: 0,
        couponDiscount: 0,
        promotionDiscount: 0,
        finalPrice: 0,
        error: `AUTH_REQUIRED: ${pageStatus.message}`,
        source: 'real',
      };
    }

    if (!response || response.status() !== 200) {
      return {
        success: false,
        price: 0,
        originalPrice: 0,
        discount: 0,
        couponDiscount: 0,
        promotionDiscount: 0,
        finalPrice: 0,
        error: `HTTP ${response?.status() || 'unknown'}`,
        source: 'real',
      };
    }

    const content = await response.text();
    const data = JSON.parse(content);

    if (!data || !data[0]) {
      return {
        success: false,
        price: 0,
        originalPrice: 0,
        discount: 0,
        couponDiscount: 0,
        promotionDiscount: 0,
        finalPrice: 0,
        error: 'API 返回数据为空',
        source: 'real',
      };
    }

    const price = parseFloat(data[0].p) || 0;
    const originalPrice = parseFloat(data[0].m) || price;

    return {
      success: true,
      price,
      originalPrice,
      discount: originalPrice - price,
      couponDiscount: 0,
      promotionDiscount: 0,
      finalPrice: price,
      error: '',
      source: 'real',
    };
  } catch (error: any) {
    return {
      success: false,
      price: 0,
      originalPrice: 0,
      discount: 0,
      couponDiscount: 0,
      promotionDiscount: 0,
      finalPrice: 0,
      error: error.message,
      source: 'real',
    };
  } finally {
    await page.close();
  }
}

// 淘宝价格抓取
async function fetchTaobaoPrice(productId: string, url: string): Promise<PriceResult> {
  const browser = await getBrowser();
  const page = await createPage(browser);

  try {
    await randomDelay();

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });

    const pageStatus = await detectPageStatus(page, 'taobao');
    if (pageStatus.type !== 'NORMAL') {
      console.log(`[Scraper] 淘宝页面异常：${pageStatus.type} - ${pageStatus.message}`);
      return {
        success: false,
        price: 0,
        originalPrice: 0,
        discount: 0,
        couponDiscount: 0,
        promotionDiscount: 0,
        finalPrice: 0,
        error: `AUTH_REQUIRED: ${pageStatus.message}`,
        source: 'real',
      };
    }

    await simulateHumanBehavior(page);

    const price = await page.evaluate(() => {
      const priceElement = document.querySelector('.Price--priceInt--5FV, .price--priceInt--3QX, [data-spm="price"]');
      if (priceElement) {
        const text = priceElement.textContent || '0';
        return parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
      }
      return 0;
    });

    if (price === 0) {
      return {
        success: false,
        price: 0,
        originalPrice: 0,
        discount: 0,
        couponDiscount: 0,
        promotionDiscount: 0,
        finalPrice: 0,
        error: '未找到价格元素',
        source: 'real',
      };
    }

    return {
      success: true,
      price,
      originalPrice: price,
      discount: 0,
      couponDiscount: 0,
      promotionDiscount: 0,
      finalPrice: price,
      error: '',
      source: 'real',
    };
  } catch (error: any) {
    return {
      success: false,
      price: 0,
      originalPrice: 0,
      discount: 0,
      couponDiscount: 0,
      promotionDiscount: 0,
      finalPrice: 0,
      error: error.message,
      source: 'real',
    };
  } finally {
    await page.close();
  }
}

// 唯品会价格抓取
async function fetchVipshopPrice(productId: string, url: string): Promise<PriceResult> {
  const browser = await getBrowser();
  const page = await createPage(browser);

  try {
    await randomDelay();

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });

    const pageStatus = await detectPageStatus(page, 'vipshop');
    if (pageStatus.type !== 'NORMAL') {
      console.log(`[Scraper] 唯品会页面异常：${pageStatus.type} - ${pageStatus.message}`);
      return {
        success: false,
        price: 0,
        originalPrice: 0,
        discount: 0,
        couponDiscount: 0,
        promotionDiscount: 0,
        finalPrice: 0,
        error: `AUTH_REQUIRED: ${pageStatus.message}`,
        source: 'real',
      };
    }

    await simulateHumanBehavior(page);

    const price = await page.evaluate(() => {
      const priceElement = document.querySelector('.c-price, .product-price, [class*="price"]');
      if (priceElement) {
        const text = priceElement.textContent || '0';
        return parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
      }
      return 0;
    });

    if (price === 0) {
      return {
        success: false,
        price: 0,
        originalPrice: 0,
        discount: 0,
        couponDiscount: 0,
        promotionDiscount: 0,
        finalPrice: 0,
        error: '未找到价格元素',
        source: 'real',
      };
    }

    return {
      success: true,
      price,
      originalPrice: price,
      discount: 0,
      couponDiscount: 0,
      promotionDiscount: 0,
      finalPrice: price,
      error: '',
      source: 'real',
    };
  } catch (error: any) {
    return {
      success: false,
      price: 0,
      originalPrice: 0,
      discount: 0,
      couponDiscount: 0,
      promotionDiscount: 0,
      finalPrice: 0,
      error: error.message,
      source: 'real',
    };
  } finally {
    await page.close();
  }
}

// 抓取商品价格
export async function fetchProductPrice(
  productId: string,
  platform: Platform,
  url: string,
  productName?: string,
  targetPrice?: number
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
        error: `不支持的平台：${platform}`,
        source: 'real',
      };
  }

  // 记录抓取日志
  try {
    const logStatus = result.success ? 'SUCCESS' : (result.error?.includes('AUTH_REQUIRED') ? 'AUTH_REQUIRED' : 'FAILED');
    await fetch('/api/fetch-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        productName: productName || '',
        platform,
        status: logStatus,
        message: result.error || '抓取成功',
        price: result.finalPrice || 0,
        targetPrice,
      }),
    }).catch(err => console.error('[Scraper] 记录日志失败:', err));
  } catch (error) {
    // 日志记录失败不影响主流程
  }

  if (result.success) {
    console.log(`[Scraper] ${platform} 价格抓取成功：¥${result.finalPrice}`);
  } else {
    console.log(`[Scraper] ${platform} 价格抓取失败：${result.error}`);
  }

  return result;
}

// 带重试的抓取
async function fetchWithRetry(
  fn: () => Promise<PriceResult>,
  retries: number = FETCH_CONFIG.maxRetries
): Promise<PriceResult> {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await fn();
      if (result.success) return result;
      if (result.error?.includes('AUTH_REQUIRED')) return result;
      if (i < retries - 1) {
        console.log(`[Scraper] 抓取失败，${FETCH_CONFIG.retryDelay / 1000}秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, FETCH_CONFIG.retryDelay));
      }
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`[Scraper] 抓取异常，${FETCH_CONFIG.retryDelay / 1000}秒后重试...`);
      await new Promise(resolve => setTimeout(resolve, FETCH_CONFIG.retryDelay));
    }
  }
  throw new Error('重试次数已用完');
}

// 批量抓取
export async function fetchMultiplePrices(
  items: Array<{ productId: string; platform: Platform; url: string; productName?: string; targetPrice?: number }>
): Promise<Map<string, PriceResult>> {
  const results = new Map<string, PriceResult>();

  for (const item of items) {
    try {
      const result = await fetchWithRetry(() => 
        fetchProductPrice(item.productId, item.platform, item.url, item.productName, item.targetPrice)
      );
      results.set(item.productId, result);
    } catch (error) {
      results.set(item.productId, {
        success: false,
        price: 0,
        originalPrice: 0,
        discount: 0,
        couponDiscount: 0,
        promotionDiscount: 0,
        finalPrice: 0,
        error: error instanceof Error ? error.message : '未知错误',
        source: 'real',
      });
    }
  }

  return results;
}

// 关闭浏览器
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    console.log('[Scraper] 浏览器已关闭');
  }
  if (loginBrowser) {
    await loginBrowser.close();
    loginBrowser = null;
    console.log('[Scraper] 登录浏览器已关闭');
  }
}
