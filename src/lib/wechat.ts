import type { Product, WechatConfig } from './types';

/**
 * 发送企业微信机器人消息
 * 文档: https://developer.work.weixin.qq.com/document/path/91770
 */
export async function sendWechatAlert(
  wechatConfig: WechatConfig,
  product: Product,
  currentPrice: number
): Promise<boolean> {
  if (!wechatConfig.enabled || !wechatConfig.webhookUrl) {
    console.log('[Wechat] 企业微信通知未启用或 Webhook 未配置，跳过发送');
    return false;
  }

  try {
    const priceDiff = product.targetPrice - currentPrice;
    const priceDiffPercent = ((priceDiff / product.targetPrice) * 100).toFixed(1);
    const isBelowTarget = currentPrice <= product.targetPrice;

    const platformNames: Record<string, string> = {
      taobao: '淘宝',
      jd: '京东',
      vipshop: '唯品会',
    };

    // 企业微信 Markdown 消息
    const message = {
      msgtype: 'markdown',
      markdown: {
        content: [
          `## ${isBelowTarget ? ' 目标价格已达成' : ' 价格变动提醒'}`,
          `> **商品名称**：<font color="info">${product.name}</font>`,
          `> **平台**：${platformNames[product.platform] || product.platform}`,
          `> **当前价格**：<font color="${isBelowTarget ? 'info' : 'warning'}">¥${currentPrice.toFixed(2)}</font>`,
          `> **目标价格**：<font color="comment">¥${product.targetPrice.toFixed(2)}</font>`,
          `> **价差**：<font color="${isBelowTarget ? 'info' : 'warning'}">${isBelowTarget ? '' : '+'}¥${Math.abs(priceDiff).toFixed(2)} (${isBelowTarget ? '' : '+'}${priceDiffPercent}%)</font>`,
          `> [点击立即购买](${product.url})`,
          `> <font color="comment">监控时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</font>`,
        ].join('\n'),
      },
    };

    const response = await fetch(wechatConfig.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    const data = await response.json() as { errcode?: number; errmsg?: string };

    if (data.errcode === 0) {
      console.log('[Wechat] 企业微信消息发送成功');
      return true;
    } else {
      console.error('[Wechat] 企业微信消息发送失败:', data.errmsg);
      return false;
    }
  } catch (error) {
    console.error('[Wechat] 企业微信消息发送异常:', error);
    return false;
  }
}

/**
 * 测试企业微信 Webhook 连接
 */
export async function testWechatWebhook(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const message = {
      msgtype: 'text',
      text: {
        content: 'PriceGuard 价格监控系统 - Webhook 连接测试成功 ✅',
      },
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    const data = await response.json() as { errcode?: number; errmsg?: string };

    if (data.errcode === 0) {
      return { success: true };
    } else {
      return { success: false, error: data.errmsg || '未知错误' };
    }
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * 发送登录失效告警
 */
export async function sendWechatAuthRequiredAlert(
  wechatConfig: WechatConfig,
  product: Product,
  reason: string
): Promise<boolean> {
  if (!wechatConfig.enabled || !wechatConfig.webhookUrl) {
    console.log('[Wechat] 企业微信通知未启用或 Webhook 未配置，跳过发送');
    return false;
  }

  try {
    const platformNames: Record<string, string> = {
      taobao: '淘宝',
      jd: '京东',
      vipshop: '唯品会',
    };

    const message = {
      msgtype: 'markdown',
      markdown: {
        content: [
          `## ⚠️ 登录失效告警`,
          `> **商品名称**：<font color="warning">${product.name}</font>`,
          `> **平台**：${platformNames[product.platform] || product.platform}`,
          `> **告警原因**：<font color="warning">${reason}</font>`,
          `> **监控状态**：<font color="comment">已暂停</font>`,
          `> <font color="comment">告警时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</font>`,
          ``,
          `**请尽快前往系统设置页面重新登录，以恢复监控。**`,
        ].join('\n'),
      },
    };

    const response = await fetch(wechatConfig.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    const data = await response.json() as { errcode?: number; errmsg?: string };

    if (data.errcode === 0) {
      console.log('[Wechat] 登录失效告警消息发送成功');
      return true;
    } else {
      console.error('[Wechat] 登录失效告警消息发送失败:', data.errmsg);
      return false;
    }
  } catch (error) {
    console.error('[Wechat] 登录失效告警消息发送异常:', error);
    return false;
  }
}
