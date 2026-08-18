import { NextRequest, NextResponse } from 'next/server';
import { getPlatformCookie, savePlatformCookie, deletePlatformCookie, getAllPlatformCookies } from '@/lib/db';
import type { Platform } from '@/lib/types';

// GET /api/cookies - 获取所有平台 Cookie
export async function GET() {
  try {
    const cookies = getAllPlatformCookies();
    // 返回时隐藏 Cookie 内容（只显示长度和更新时间）
    const safeCookies = cookies.map(c => ({
      platform: c.platform,
      hasCookie: c.cookie.length > 0,
      cookieLength: c.cookie.length,
      updatedAt: c.updatedAt,
    }));
    return NextResponse.json({ success: true, data: safeCookies });
  } catch (error) {
    console.error('[API] 获取 Cookie 失败:', error);
    return NextResponse.json({ success: false, error: '获取 Cookie 失败' }, { status: 500 });
  }
}

// PUT /api/cookies - 保存平台 Cookie
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, cookie } = body as { platform?: string; cookie?: string };

    if (!platform || !['taobao', 'jd', 'vipshop'].includes(platform)) {
      return NextResponse.json({ success: false, error: '无效的平台' }, { status: 400 });
    }

    if (cookie === undefined) {
      return NextResponse.json({ success: false, error: 'Cookie 不能为空' }, { status: 400 });
    }

    const result = savePlatformCookie(platform as Platform, cookie);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[API] 保存 Cookie 失败:', error);
    return NextResponse.json({ success: false, error: '保存 Cookie 失败' }, { status: 500 });
  }
}

// DELETE /api/cookies - 删除平台 Cookie
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');

    if (!platform || !['taobao', 'jd', 'vipshop'].includes(platform)) {
      return NextResponse.json({ success: false, error: '无效的平台' }, { status: 400 });
    }

    deletePlatformCookie(platform as Platform);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] 删除 Cookie 失败:', error);
    return NextResponse.json({ success: false, error: '删除 Cookie 失败' }, { status: 500 });
  }
}
