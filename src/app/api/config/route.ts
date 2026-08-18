import { NextRequest, NextResponse } from 'next/server';
import { getSystemConfig, updateSystemConfig } from '@/lib/db';
import { testEmailConfig } from '@/lib/email';

// GET /api/config - 获取系统配置
export async function GET() {
  try {
    const config = getSystemConfig();
    // 隐藏密码
    const safeConfig = {
      ...config,
      emailConfig: {
        ...config.emailConfig,
        smtpPass: config.emailConfig.smtpPass ? '******' : '',
      },
    };
    return NextResponse.json({ success: true, data: safeConfig });
  } catch (error) {
    console.error('[API] 获取配置失败:', error);
    return NextResponse.json({ success: false, error: '获取配置失败' }, { status: 500 });
  }
}

// PUT /api/config - 更新系统配置
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { defaultCheckInterval, maxProducts, emailConfig } = body as {
      defaultCheckInterval?: number;
      maxProducts?: number;
      emailConfig?: {
        smtpHost?: string;
        smtpPort?: number;
        smtpUser?: string;
        smtpPass?: string;
        fromEmail?: string;
        toEmail?: string;
        enabled?: boolean;
      };
    };

    const updateData: Record<string, unknown> = {};
    if (defaultCheckInterval !== undefined) updateData.defaultCheckInterval = defaultCheckInterval;
    if (maxProducts !== undefined) updateData.maxProducts = maxProducts;
    if (emailConfig) {
      const currentConfig = getSystemConfig();
      updateData.emailConfig = {
        smtpHost: emailConfig.smtpHost ?? currentConfig.emailConfig.smtpHost,
        smtpPort: emailConfig.smtpPort ?? currentConfig.emailConfig.smtpPort,
        smtpUser: emailConfig.smtpUser ?? currentConfig.emailConfig.smtpUser,
        smtpPass: emailConfig.smtpPass === '******' ? currentConfig.emailConfig.smtpPass : (emailConfig.smtpPass ?? currentConfig.emailConfig.smtpPass),
        fromEmail: emailConfig.fromEmail ?? currentConfig.emailConfig.fromEmail,
        toEmail: emailConfig.toEmail ?? currentConfig.emailConfig.toEmail,
        enabled: emailConfig.enabled ?? currentConfig.emailConfig.enabled,
      };
    }

    const config = updateSystemConfig(updateData);
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('[API] 更新配置失败:', error);
    return NextResponse.json({ success: false, error: '更新配置失败' }, { status: 500 });
  }
}

// POST /api/config/test-email - 测试邮件配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emailConfig } = body as {
      emailConfig: {
        smtpHost: string;
        smtpPort: number;
        smtpUser: string;
        smtpPass: string;
        fromEmail: string;
        toEmail: string;
        enabled: boolean;
      };
    };

    if (!emailConfig?.smtpHost || !emailConfig?.smtpUser || !emailConfig?.smtpPass) {
      return NextResponse.json({ success: false, error: '请填写完整的 SMTP 配置' }, { status: 400 });
    }

    const result = await testEmailConfig(emailConfig);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] 测试邮件失败:', error);
    return NextResponse.json({ success: false, error: '测试邮件发送失败' }, { status: 500 });
  }
}
