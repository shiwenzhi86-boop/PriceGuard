import { NextResponse } from 'next/server';
import { getNotifications } from '@/lib/db';

// GET /api/notifications - 获取通知记录
export async function GET() {
  try {
    const notifications = getNotifications(100);
    return NextResponse.json({ success: true, data: notifications });
  } catch (error) {
    console.error('[API] 获取通知记录失败:', error);
    return NextResponse.json({ success: false, error: '获取通知记录失败' }, { status: 500 });
  }
}
