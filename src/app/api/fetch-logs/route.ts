import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const LOG_DIR = path.join(process.cwd(), 'data', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'fetch.log');

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 写入日志
function appendLog(log: FetchLog) {
  const logLine = JSON.stringify(log) + '\n';
  fs.appendFileSync(LOG_FILE, logLine);
}

// 读取日志
function readLogs(limit: number = 100): FetchLog[] {
  if (!fs.existsSync(LOG_FILE)) {
    return [];
  }

  const content = fs.readFileSync(LOG_FILE, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line);
  
  return lines
    .slice(-limit)
    .map(line => JSON.parse(line))
    .reverse();
}

export interface FetchLog {
  timestamp: string;
  productId: string;
  productName: string;
  platform: string;
  status: 'SUCCESS' | 'FAILED' | 'AUTH_REQUIRED';
  message: string;
  price?: number;
  targetPrice?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');

    let logs = readLogs(limit);

    // 过滤
    if (platform) {
      logs = logs.filter(log => log.platform === platform);
    }
    if (status) {
      logs = logs.filter(log => log.status === status);
    }

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const log: FetchLog = {
      timestamp: new Date().toISOString(),
      ...body,
    };

    appendLog(log);

    return NextResponse.json({
      success: true,
      message: '日志已记录',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (fs.existsSync(LOG_FILE)) {
      fs.unlinkSync(LOG_FILE);
    }

    return NextResponse.json({
      success: true,
      message: '日志已清空',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
