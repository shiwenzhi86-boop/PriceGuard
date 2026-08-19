import { NextRequest, NextResponse } from 'next/server';
import { getProduct, updateProduct, deleteProduct, getPriceHistory } from '@/lib/db';

// GET /api/products/[id] - 获取商品详情 + 价格历史
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await getProduct(id);
    if (!product) {
      return NextResponse.json({ success: false, error: '商品不存在' }, { status: 404 });
    }

    const priceHistory = await getPriceHistory(id, 30);
    return NextResponse.json({ success: true, data: { ...product, priceHistory } });
  } catch (error) {
    console.error('[API] 获取商品详情失败:', error);
    return NextResponse.json({ success: false, error: '获取商品详情失败' }, { status: 500 });
  }
}

// PUT /api/products/[id] - 更新商品
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, url, targetPrice, status, checkInterval } = body as {
      name?: string;
      url?: string;
      targetPrice?: number;
      status?: string;
      checkInterval?: number;
    };

    const existing = await getProduct(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: '商品不存在' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;
    if (targetPrice !== undefined) {
      if (typeof targetPrice !== 'number' || targetPrice <= 0) {
        return NextResponse.json({ success: false, error: '目标价格必须为正数' }, { status: 400 });
      }
      updateData.targetPrice = targetPrice;
    }
    if (status !== undefined) updateData.status = status;
    if (checkInterval !== undefined) updateData.checkInterval = checkInterval;

    const product = await updateProduct(id, updateData);
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error('[API] 更新商品失败:', error);
    return NextResponse.json({ success: false, error: '更新商品失败' }, { status: 500 });
  }
}

// DELETE /api/products/[id] - 删除商品
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteProduct(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: '商品不存在' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] 删除商品失败:', error);
    return NextResponse.json({ success: false, error: '删除商品失败' }, { status: 500 });
  }
}
