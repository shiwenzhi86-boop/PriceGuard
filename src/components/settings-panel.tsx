'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, TestTube, CheckCircle, XCircle, Loader2, Cookie, Trash2, RefreshCw } from 'lucide-react';

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  toEmail: string;
  enabled: boolean;
}

interface WechatConfig {
  webhookUrl: string;
  enabled: boolean;
}

interface CookieInfo {
  platform: string;
  hasCookie: boolean;
  cookieLength: number;
  updatedAt: string;
}

interface SystemConfig {
  id: string;
  defaultCheckInterval: number;
  maxProducts: number;
  emailConfig: EmailConfig;
  wechatConfig: WechatConfig;
  updatedAt: string;
}

const PLATFORM_NAMES: Record<string, string> = {
  taobao: '淘宝',
  jd: '京东',
  vipshop: '唯品会',
};

export function SettingsPanel() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [cookies, setCookies] = useState<CookieInfo[]>([]);
  const [cookieInputs, setCookieInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchCookies();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
      }
    } catch (error) {
      console.error('获取配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCookies = async () => {
    try {
      const res = await fetch('/api/cookies');
      const data = await res.json();
      if (data.success) {
        setCookies(data.data);
      }
    } catch (error) {
      console.error('获取 Cookie 状态失败:', error);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultCheckInterval: config.defaultCheckInterval,
          maxProducts: config.maxProducts,
          emailConfig: config.emailConfig,
          wechatConfig: config.wechatConfig,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('保存配置失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (type: 'email' | 'wechat') => {
    if (!config) return;
    setTesting(true);
    setTestResult(null);
    try {
      const body = type === 'email'
        ? { type: 'email', emailConfig: config.emailConfig }
        : { type: 'wechat', webhookUrl: config.wechatConfig.webhookUrl };
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ success: false, error: '网络错误' });
    } finally {
      setTesting(false);
    }
  };

  const updateEmailConfig = (field: keyof EmailConfig, value: string | number | boolean) => {
    if (!config) return;
    setConfig({
      ...config,
      emailConfig: { ...config.emailConfig, [field]: value },
    });
  };

  const updateWechatConfig = (field: keyof WechatConfig, value: string | boolean) => {
    if (!config) return;
    setConfig({
      ...config,
      wechatConfig: { ...config.wechatConfig, [field]: value },
    });
  };

  const handleSaveCookie = async (platform: string) => {
    const cookie = cookieInputs[platform]?.trim();
    if (!cookie) return;
    try {
      const res = await fetch('/api/cookies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, cookie }),
      });
      const data = await res.json();
      if (data.success) {
        setCookieInputs(prev => ({ ...prev, [platform]: '' }));
        fetchCookies();
      }
    } catch (error) {
      console.error('保存 Cookie 失败:', error);
    }
  };

  const handleDeleteCookie = async (platform: string) => {
    try {
      const res = await fetch(`/api/cookies?platform=${platform}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchCookies();
      }
    } catch (error) {
      console.error('删除 Cookie 失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        <span className="ml-3 text-[#94A3B8]">加载配置...</span>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-20 text-[#94A3B8]">
        加载配置失败，请刷新页面重试
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* General Settings */}
      <div className="bg-[#1A1D27] border border-[#2D3348] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">通用设置</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-[#94A3B8]">默认检查间隔（分钟）</Label>
            <Input
              type="number"
              min="5"
              max="1440"
              value={config.defaultCheckInterval}
              onChange={e => setConfig({ ...config, defaultCheckInterval: parseInt(e.target.value) || 60 })}
              className="bg-[#0F1117] border-[#2D3348] text-white"
            />
            <p className="text-xs text-[#94A3B8]">新添加商品的默认价格检查间隔</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-[#94A3B8]">最大监控商品数</Label>
            <Input
              type="number"
              min="1"
              max="200"
              value={config.maxProducts}
              onChange={e => setConfig({ ...config, maxProducts: parseInt(e.target.value) || 50 })}
              className="bg-[#0F1117] border-[#2D3348] text-white"
            />
          </div>
        </div>
      </div>

      {/* Cookie Management */}
      <div className="bg-[#1A1D27] border border-[#2D3348] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Cookie className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">浏览器 Cookie 管理</h3>
        </div>
        <p className="text-sm text-[#94A3B8] mb-4">
          在浏览器登录对应平台后，F12 → Network → 复制请求头中的 Cookie 粘贴到下方。
          系统会带着你的登录态获取真实价格（含优惠券、会员价等）。
        </p>
        <div className="space-y-4">
          {(['taobao', 'jd', 'vipshop'] as const).map(platform => {
            const info = cookies.find(c => c.platform === platform);
            return (
              <div key={platform} className="p-4 rounded-lg bg-[#0F1117] border border-[#2D3348]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{PLATFORM_NAMES[platform]}</span>
                    {info?.hasCookie ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                        已配置 ({info.cookieLength} 字符)
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#2D3348] text-[#94A3B8]">
                        未配置
                      </span>
                    )}
                  </div>
                  {info?.hasCookie && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCookie(platform)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="粘贴 Cookie 字符串..."
                    value={cookieInputs[platform] || ''}
                    onChange={e => setCookieInputs(prev => ({ ...prev, [platform]: e.target.value }))}
                    className="bg-[#1A1D27] border-[#2D3348] text-white text-sm placeholder:text-[#94A3B8]"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSaveCookie(platform)}
                    disabled={!cookieInputs[platform]?.trim()}
                    className="bg-blue-500 hover:bg-blue-600 text-white shrink-0"
                  >
                    保存
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-300">
            <strong>提示：</strong>Cookie 有效期通常为 1-7 天。过期后系统会自动降级为模拟数据。
            未配置 Cookie 的平台将使用模拟价格数据。
          </p>
        </div>
      </div>

      {/* Email Settings */}
      <div className="bg-[#1A1D27] border border-[#2D3348] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">邮件通知</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#94A3B8]">启用</span>
            <Switch
              checked={config.emailConfig.enabled}
              onCheckedChange={checked => updateEmailConfig('enabled', checked)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-[#94A3B8]">SMTP 服务器</Label>
              <Input
                placeholder="smtp.qq.com"
                value={config.emailConfig.smtpHost}
                onChange={e => updateEmailConfig('smtpHost', e.target.value)}
                className="bg-[#0F1117] border-[#2D3348] text-white placeholder:text-[#94A3B8]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-[#94A3B8]">端口</Label>
              <Input
                type="number"
                placeholder="465"
                value={config.emailConfig.smtpPort}
                onChange={e => updateEmailConfig('smtpPort', parseInt(e.target.value) || 465)}
                className="bg-[#0F1117] border-[#2D3348] text-white placeholder:text-[#94A3B8]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-[#94A3B8]">SMTP 用户名</Label>
            <Input
              placeholder="your@email.com"
              value={config.emailConfig.smtpUser}
              onChange={e => updateEmailConfig('smtpUser', e.target.value)}
              className="bg-[#0F1117] border-[#2D3348] text-white placeholder:text-[#94A3B8]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-[#94A3B8]">SMTP 密码 / 授权码</Label>
            <Input
              type="password"
              placeholder="SMTP 密码或授权码"
              value={config.emailConfig.smtpPass}
              onChange={e => updateEmailConfig('smtpPass', e.target.value)}
              className="bg-[#0F1117] border-[#2D3348] text-white placeholder:text-[#94A3B8]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-[#94A3B8]">发件人邮箱</Label>
              <Input
                placeholder="your@email.com"
                value={config.emailConfig.fromEmail}
                onChange={e => updateEmailConfig('fromEmail', e.target.value)}
                className="bg-[#0F1117] border-[#2D3348] text-white placeholder:text-[#94A3B8]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-[#94A3B8]">收件人邮箱</Label>
              <Input
                placeholder="receiver@email.com"
                value={config.emailConfig.toEmail}
                onChange={e => updateEmailConfig('toEmail', e.target.value)}
                className="bg-[#0F1117] border-[#2D3348] text-white placeholder:text-[#94A3B8]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTest('email')}
              disabled={testing || !config.emailConfig.smtpHost}
              className="border-[#2D3348] text-[#94A3B8]"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4 mr-2" />
              )}
              测试邮件
            </Button>
            {testResult && (
              <div className={`flex items-center gap-1 text-sm ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {testResult.success ? (
                  <><CheckCircle className="w-4 h-4" /> 连接成功</>
                ) : (
                  <><XCircle className="w-4 h-4" /> {testResult.error || '连接失败'}</>
                )}
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-[#0F1117] border border-[#2D3348]">
            <p className="text-xs text-[#94A3B8]">
              <strong className="text-white">常用 SMTP 配置：</strong><br />
              QQ邮箱：smtp.qq.com:465（需开启SMTP并使用授权码）<br />
              163邮箱：smtp.163.com:465（需开启SMTP并使用授权码）<br />
              Gmail：smtp.gmail.com:587（需开启应用密码）
            </p>
          </div>
        </div>
      </div>

      {/* WeChat Work Settings */}
      <div className="bg-[#1A1D27] border border-[#2D3348] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">企业微信通知</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#94A3B8]">启用</span>
            <Switch
              checked={config.wechatConfig.enabled}
              onCheckedChange={checked => updateWechatConfig('enabled', checked)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-[#94A3B8]">群机器人 Webhook URL</Label>
            <Input
              placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
              value={config.wechatConfig.webhookUrl}
              onChange={e => updateWechatConfig('webhookUrl', e.target.value)}
              className="bg-[#0F1117] border-[#2D3348] text-white placeholder:text-[#94A3B8]"
            />
            <p className="text-xs text-[#94A3B8]">
              企业微信群聊 → 群设置 → 群机器人 → 新建 → 复制 Webhook URL
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTest('wechat')}
              disabled={testing || !config.wechatConfig.webhookUrl}
              className="border-[#2D3348] text-[#94A3B8]"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4 mr-2" />
              )}
              测试推送
            </Button>
            {testResult && (
              <div className={`flex items-center gap-1 text-sm ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {testResult.success ? (
                  <><CheckCircle className="w-4 h-4" /> 推送成功</>
                ) : (
                  <><XCircle className="w-4 h-4" /> {testResult.error || '推送失败'}</>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          保存设置
        </Button>
        {saveSuccess && (
          <span className="text-sm text-emerald-400 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" /> 已保存
          </span>
        )}
      </div>
    </div>
  );
}
