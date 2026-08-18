import nodemailer from 'nodemailer';
import type { Product, EmailConfig } from './types';

export async function sendPriceAlert(
  emailConfig: EmailConfig,
  product: Product,
  currentPrice: number
): Promise<boolean> {
  if (!emailConfig.enabled || !emailConfig.smtpHost || !emailConfig.toEmail) {
    console.log('[Email] 邮件通知未启用或配置不完整，跳过发送');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: emailConfig.smtpHost,
      port: emailConfig.smtpPort,
      secure: emailConfig.smtpPort === 465,
      auth: {
        user: emailConfig.smtpUser,
        pass: emailConfig.smtpPass,
      },
    });

    const priceDiff = product.targetPrice - currentPrice;
    const priceDiffPercent = ((priceDiff / product.targetPrice) * 100).toFixed(1);
    const isBelowTarget = currentPrice <= product.targetPrice;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #1A1D27; color: #E2E8F0; border-radius: 12px; overflow: hidden;">
        <div style="background: ${isBelowTarget ? '#10B981' : '#3B82F6'}; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; color: white;">
            ${isBelowTarget ? '🎉 目标价格已达成！' : '📊 价格变动提醒'}
          </h1>
        </div>
        <div style="padding: 24px;">
          <div style="background: #0F1117; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
            <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #E2E8F0;">${product.name}</h2>
            <div style="display: flex; gap: 24px; flex-wrap: wrap;">
              <div>
                <div style="font-size: 12px; color: #94A3B8; margin-bottom: 4px;">当前价格</div>
                <div style="font-size: 28px; font-weight: 700; color: ${isBelowTarget ? '#10B981' : '#F59E0B'};">
                  ¥${currentPrice.toFixed(2)}
                </div>
              </div>
              <div>
                <div style="font-size: 12px; color: #94A3B8; margin-bottom: 4px;">目标价格</div>
                <div style="font-size: 28px; font-weight: 700; color: #3B82F6;">
                  ¥${product.targetPrice.toFixed(2)}
                </div>
              </div>
              <div>
                <div style="font-size: 12px; color: #94A3B8; margin-bottom: 4px;">价差</div>
                <div style="font-size: 28px; font-weight: 700; color: ${isBelowTarget ? '#10B981' : '#EF4444'};">
                  ${isBelowTarget ? '-' : '+'}¥${Math.abs(priceDiff).toFixed(2)} (${priceDiffPercent}%)
                </div>
              </div>
            </div>
          </div>
          <div style="text-align: center; margin-top: 24px;">
            <a href="${product.url}" target="_blank" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              立即前往购买 →
            </a>
          </div>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #2D3348; font-size: 12px; color: #94A3B8; text-align: center;">
            <p>此邮件由电商价格监控系统自动发送</p>
            <p>监控时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p>
          </div>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"价格监控" <${emailConfig.fromEmail}>`,
      to: emailConfig.toEmail,
      subject: `${isBelowTarget ? '🎉 目标价达成' : '📊 价格变动'} - ${product.name} 当前 ¥${currentPrice.toFixed(2)}`,
      html: htmlContent,
    });

    console.log('[Email] 邮件发送成功:', info.messageId);
    return true;
  } catch (error) {
    console.error('[Email] 邮件发送失败:', error);
    return false;
  }
}

export async function testEmailConfig(emailConfig: EmailConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: emailConfig.smtpHost,
      port: emailConfig.smtpPort,
      secure: emailConfig.smtpPort === 465,
      auth: {
        user: emailConfig.smtpUser,
        pass: emailConfig.smtpPass,
      },
    });

    await transporter.verify();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
