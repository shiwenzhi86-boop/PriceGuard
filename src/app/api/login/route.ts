import { NextRequest, NextResponse } from 'next/server';
import { launchLoginBrowser } from '@/lib/scraper';
import type { Platform } from '@/lib/types';

/**
 * POST /api/login - 启动有头模式浏览器进行登录
 * 会弹出可见的 Chrome 窗口，用户在里面登录对应平台
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const platform: Platform = body.platform || 'jd';

    const result = await launchLoginBrowser(platform);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '启动登录浏览器失败',
      },
      { status: 500 }
    );
  }
}
