/**
 * 页面状态检测器
 * 检测电商页面的异常状态（登录框、验证码、访问限制等）
 */

import type { Page } from 'puppeteer';

export type PageStatusType = 'NORMAL' | 'LOGIN_REQUIRED' | 'CAPTCHA' | 'BLOCKED' | 'UNKNOWN';

export interface PageStatus {
  type: PageStatusType;
  message: string;
  details?: string;
}

/**
 * 检测页面状态
 */
export async function detectPageStatus(page: Page, platform: string): Promise<PageStatus> {
  try {
    const status = await page.evaluate((platform: string): PageStatus => {
      const bodyText = document.body.innerText;
      const url = window.location.href;

      // 检测登录框
      const loginSelectors = [
        '.login-form',
        '#login',
        '.passport-login',
        '.login-container',
        '[class*="login"]',
        '[id*="login"]',
      ];

      for (const selector of loginSelectors) {
        const el = document.querySelector(selector);
        if (el && el.clientHeight > 100) {
          return { type: 'LOGIN_REQUIRED', message: '需要登录', details: `检测到登录元素：${selector}` };
        }
      }

      // 检测滑块验证码
      const captchaSelectors = [
        '.captcha-slider',
        '#nc_1_n1z',
        '.verify-slider',
        '[class*="captcha"]',
        '[class*="slider"]',
        '[class*="verify"]',
        '.nc-container',
        '#captcha',
      ];

      for (const selector of captchaSelectors) {
        const el = document.querySelector(selector);
        if (el && el.clientHeight > 0) {
          return { type: 'CAPTCHA', message: '需要验证码', details: `检测到验证码元素：${selector}` };
        }
      }

      // 检测异常访问提示
      const blockedKeywords = [
        '当前页面异常',
        '访问受限',
        '请稍后重试',
        '访问过于频繁',
        '您的访问被阻止',
        '网络异常',
        '系统繁忙',
        '请刷新页面',
      ];

      for (const keyword of blockedKeywords) {
        if (bodyText.includes(keyword)) {
          return { type: 'BLOCKED', message: '访问被限制', details: `检测到关键词：${keyword}` };
        }
      }

      // 平台特定检测
      if (platform === 'jd') {
        // 京东特定检测
        if (bodyText.includes('京东安全中心') || bodyText.includes('风险验证')) {
          return { type: 'CAPTCHA', message: '京东安全验证', details: '检测到京东安全中心' };
        }
      } else if (platform === 'taobao') {
        // 淘宝特定检测
        if (bodyText.includes('淘宝安全中心') || bodyText.includes('滑块验证')) {
          return { type: 'CAPTCHA', message: '淘宝安全验证', details: '检测到淘宝安全中心' };
        }
      } else if (platform === 'vipshop') {
        // 唯品会特定检测
        if (bodyText.includes('唯品会安全中心')) {
          return { type: 'CAPTCHA', message: '唯品会安全验证', details: '检测到唯品会安全中心' };
        }
      }

      return { type: 'NORMAL', message: '正常' };
    }, platform);

    return status;
  } catch (error) {
    return {
      type: 'UNKNOWN',
      message: '检测失败',
      details: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 模拟真人浏览行为
 */
export async function simulateHumanBehavior(page: Page): Promise<void> {
  // 随机滚动
  const scrollCount = Math.floor(Math.random() * 3) + 2; // 2-4 次
  for (let i = 0; i < scrollCount; i++) {
    const scrollAmount = Math.floor(Math.random() * 200) + 100; // 100-300px
    await page.evaluate((amount: number) => {
      window.scrollBy(0, amount);
    }, scrollAmount);
    await delay(Math.floor(Math.random() * 2000) + 1000); // 1-3 秒
  }

  // 随机鼠标移动
  const x = Math.floor(Math.random() * 800) + 100;
  const y = Math.floor(Math.random() * 600) + 100;
  await page.mouse.move(x, y);
  await delay(Math.floor(Math.random() * 1000) + 500); // 0.5-1.5 秒
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 随机延迟（用于抓取间隔）
 */
export function randomDelay(min: number = 5000, max: number = 12000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}
