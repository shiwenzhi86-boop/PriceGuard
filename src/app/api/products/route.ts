import { NextRequest, NextResponse } from 'next/server';
import { getAllProducts, createProduct, getProductCount, getSystemConfig } from '@/lib/db';
import { detectPlatform, extractProductId } from '@/lib/types';

// GET /api/products - 获取所有商品
export async function GET() {
  try {
    const products = await getAllProducts();
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error('[API] 获取商品列表失败:', error);
    return NextResponse.json({ success: false, error: '获取商品列表失败' }, { status: 500 });
  }
}

// POST /api/products - 添加商品
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, targetPrice, checkInterval } = body as {
      name?: string;
      url?: string;
      targetPrice?: number;
      checkInterval?: number;
    };

    if (!url || !targetPrice) {
      return NextResponse.json({ success: false, error: '商品链接和目标价格为必填项' }, { status: 400 });
    }

    if (typeof targetPrice !== 'number' || targetPrice <= 0) {
      return NextResponse.json({ success: false, error: '目标价格必须为正数' }, { status: 400 });
    }

    // 检查数量限制
    const config = await getSystemConfig();
    const count = await getProductCount();
    if (count >= config.maxProducts) {
      return NextResponse.json({ success: false, error: `已达到最大监控数量限制 (${config.maxProducts})` }, { status: 400 });
    }

    // 识别平台
    const platform = detectPlatform(url);
    if (!platform) {
      return NextResponse.json({ success: false, error: '无法识别商品平台，请检查链接是否正确（支持淘宝/京东/唯品会）' }, { status: 400 });
    }

    // 提取商品 ID
    const productId = extractProductId(url, platform);

    // 生成商品名称
    const productName = name || `监控商品-${productId || Date.now().toString().slice(-6)}`;

    const product = await createProduct({
      name: productName,
      platform,
      url,
      productId: productId || url,
      targetPrice,
      checkInterval: checkInterval || config.defaultCheckInterval,
    });

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error('[API] 添加商品失败:', error);
    return NextResponse.json({ success: false, error: '添加商品失败' }, { status: 500 });
  }
}
