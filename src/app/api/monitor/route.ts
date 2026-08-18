import { NextResponse } from 'next/server';
import { getAllProducts, updateProduct, addPriceRecord, addNotificationRecord, getSystemConfig } from '@/lib/db';
import { fetchProductPrice } from '@/lib/scraper';
import { sendPriceAlert } from '@/lib/email';
import { sendWechatAlert } from '@/lib/wechat';

// POST /api/monitor/run - 手动触发一次价格检查
export async function POST() {
  try {
    const products = getAllProducts().filter(p => p.status === 'active' || p.status === 'target_reached');
    const config = getSystemConfig();
    const results: Array<{ productId: string; name: string; success: boolean; price?: number; notified?: boolean }> = [];

    for (const product of products) {
      try {
        // 检查是否到了检查时间
        if (product.lastCheckedAt) {
          const lastCheck = new Date(product.lastCheckedAt).getTime();
          const intervalMs = product.checkInterval * 60 * 1000;
          if (Date.now() - lastCheck < intervalMs) {
            results.push({ productId: product.id, name: product.name, success: false });
            continue;
          }
        }

        // 抓取价格
        const priceResult = await fetchProductPrice(product.productId, product.platform, product.url);

        if (!priceResult.success) {
          updateProduct(product.id, { status: 'error' });
          results.push({ productId: product.id, name: product.name, success: false });
          continue;
        }

        // 记录价格
        addPriceRecord({
          productId: product.id,
          price: priceResult.price,
          originalPrice: priceResult.originalPrice,
          discount: priceResult.discount,
          couponDiscount: priceResult.couponDiscount,
          promotionDiscount: priceResult.promotionDiscount,
          finalPrice: priceResult.finalPrice,
        });

        // 检查是否达到目标价格
        let notified = false;
        if (priceResult.finalPrice <= product.targetPrice) {
          // 更新状态
          updateProduct(product.id, { status: 'target_reached' });

          // 发送邮件通知
          const emailSent = await sendPriceAlert(config.emailConfig, product, priceResult.finalPrice);

          // 发送企业微信通知
          const wechatSent = await sendWechatAlert(config.wechatConfig, product, priceResult.finalPrice);

          addNotificationRecord({
            productId: product.id,
            type: 'price_reached',
            message: `商品价格已达目标价！当前 ¥${priceResult.finalPrice}，目标 ¥${product.targetPrice}`,
            currentPrice: priceResult.finalPrice,
            targetPrice: product.targetPrice,
            success: emailSent || wechatSent,
          });

          notified = true;
        } else {
          // 检查价格变化趋势
          if (product.currentPrice && priceResult.finalPrice < product.currentPrice) {
            addNotificationRecord({
              productId: product.id,
              type: 'price_drop',
              message: `价格下降：¥${product.currentPrice} → ¥${priceResult.finalPrice}`,
              currentPrice: priceResult.finalPrice,
              targetPrice: product.targetPrice,
              success: false,
            });
          }
          updateProduct(product.id, { status: 'active' });
        }

        results.push({
          productId: product.id,
          name: product.name,
          success: true,
          price: priceResult.finalPrice,
          notified,
        });
      } catch (error) {
        console.error(`[Monitor] 检查商品 ${product.name} 失败:`, error);
        results.push({ productId: product.id, name: product.name, success: false });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const notifiedCount = results.filter(r => r.notified).length;

    return NextResponse.json({
      success: true,
      data: {
        total: products.length,
        checked: successCount,
        notified: notifiedCount,
        results,
      },
    });
  } catch (error) {
    console.error('[API] 执行监控失败:', error);
    return NextResponse.json({ success: false, error: '执行监控失败' }, { status: 500 });
  }
}

// GET /api/monitor/status - 获取监控状态
export async function GET() {
  try {
    const products = getAllProducts();
    const stats = {
      total: products.length,
      active: products.filter(p => p.status === 'active').length,
      targetReached: products.filter(p => p.status === 'target_reached').length,
      error: products.filter(p => p.status === 'error').length,
      paused: products.filter(p => p.status === 'paused').length,
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('[API] 获取监控状态失败:', error);
    return NextResponse.json({ success: false, error: '获取监控状态失败' }, { status: 500 });
  }
}
