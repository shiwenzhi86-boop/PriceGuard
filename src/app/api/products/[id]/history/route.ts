import { NextRequest, NextResponse } from 'next/server';
import { getPriceHistory } from '@/lib/db';

// GET /api/products/[id]/history - 获取价格历史
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const history = getPriceHistory(id, 90);
    return NextResponse.json({ success: true, data: history });
  } catch (error) {
    console.error('[API] 获取价格历史失败:', error);
    return NextResponse.json({ success: false, error: '获取价格历史失败' }, { status: 500 });
  }
}
