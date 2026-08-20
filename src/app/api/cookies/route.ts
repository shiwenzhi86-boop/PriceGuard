import { NextResponse } from 'next/server';
import { exportCookies, importCookies, backupProfile, restoreProfile, getBackupList } from '@/lib/cookie-manager';
import type { Platform } from '@/lib/types';

/**
 * GET /api/cookies - 获取 Cookie 或备份列表
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const platform = searchParams.get('platform') as Platform;
    
    // 获取备份列表
    if (action === 'backups') {
      const backups = await getBackupList();
      return NextResponse.json({
        success: true,
        data: backups,
      });
    }
    
    // 导出 Cookie
    if (platform) {
      const cookieJson = await exportCookies(platform);
      return NextResponse.json({
        success: true,
        data: {
          platform,
          cookies: cookieJson,
        },
      });
    }
    
    return NextResponse.json({
      success: false,
      error: '缺少参数：platform 或 action',
    }, { status: 400 });
  } catch (error: any) {
    console.error('[Cookies] 获取失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

/**
 * POST /api/cookies - 导入 Cookie 或备份/恢复
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, platform, cookieJson, backupPath } = body;
    
    // 导入 Cookie
    if (action === 'import' && platform && cookieJson) {
      const result = await importCookies(platform, cookieJson);
      return NextResponse.json(result);
    }
    
    // 备份用户数据目录
    if (action === 'backup') {
      const result = await backupProfile();
      return NextResponse.json(result);
    }
    
    // 恢复用户数据目录
    if (action === 'restore' && backupPath) {
      const result = await restoreProfile(backupPath);
      return NextResponse.json(result);
    }
    
    return NextResponse.json({
      success: false,
      error: '缺少参数或参数错误',
    }, { status: 400 });
  } catch (error: any) {
    console.error('[Cookies] 操作失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
