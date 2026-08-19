import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// 项目根目录（E:\PriceGuard 或沙箱路径）
const PROJECT_ROOT = process.env.COZE_WORKSPACE_PATH || path.resolve(process.cwd(), '..');

/**
 * GET /api/update - 检查是否有更新
 * POST /api/update - 拉取最新代码并重启
 */
export async function GET() {
  try {
    // 检查是否在 git 仓库中
    const { stdout: remoteUrl } = await execAsync('git remote get-url origin', {
      cwd: PROJECT_ROOT,
    });

    // 检查是否有新提交
    await execAsync('git fetch origin', { cwd: PROJECT_ROOT });
    const { stdout: localCommit } = await execAsync('git rev-parse HEAD', {
      cwd: PROJECT_ROOT,
    });
    const { stdout: remoteCommit } = await execAsync('git rev-parse origin/main', {
      cwd: PROJECT_ROOT,
    });

    const hasUpdate = localCommit.trim() !== remoteCommit.trim();

    return NextResponse.json({
      success: true,
      data: {
        remoteUrl: remoteUrl.trim(),
        hasUpdate,
        localCommit: localCommit.trim().slice(0, 7),
        remoteCommit: remoteCommit.trim().slice(0, 7),
      },
    });
  } catch (error: unknown) {
    const err = error as { stderr?: string };
    return NextResponse.json(
      {
        success: false,
        error: `检查更新失败: ${err.stderr || (error as Error).message}`,
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // 1. 拉取最新代码
    const { stdout: pullResult } = await execAsync('git pull origin main', {
      cwd: PROJECT_ROOT,
      timeout: 60000,
    });

    // 2. 安装依赖（如果 package.json 有变化）
    await execAsync('pnpm install', {
      cwd: PROJECT_ROOT,
      timeout: 120000,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: '更新成功',
        pullResult: pullResult.trim(),
      },
    });
  } catch (error: unknown) {
    const err = error as { stderr?: string };
    return NextResponse.json(
      {
        success: false,
        error: `更新失败: ${err.stderr || (error as Error).message}`,
      },
      { status: 500 }
    );
  }
}
