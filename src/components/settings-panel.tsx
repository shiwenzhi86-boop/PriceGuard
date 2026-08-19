'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, TestTube, CheckCircle, XCircle, Loader2, LogIn, Cookie, RefreshCw, Download } from 'lucide-react';

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

interface SystemConfig {
  id: string;
  defaultCheckInterval: number;
  maxProducts: number;
  emailConfig: EmailConfig;
  wechatConfig: WechatConfig;
  updatedAt: string;
}

export function SettingsPanel() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginResult, setLoginResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<{ success: boolean; message?: string } | null>(null);

  useEffect(() => {
    fetchConfig();
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

  const handleLogin = async (platform: 'jd' | 'taobao' | 'vip') => {
    setLoggingIn(true);
    setLoginResult(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      setLoginResult(data);
    } catch (error) {
      setLoginResult({ success: false, message: '网络错误，请检查程序是否正常运行' });
    } finally {
      setLoggingIn(false);
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    setUpdateResult(null);
    try {
      const res = await fetch('/api/update', {
        method: 'POST',
      });
      const data = await res.json();
      setUpdateResult(data);
    } catch (error) {
      setUpdateResult({ success: false, message: '网络错误，请检查程序是否正常运行' });
    } finally {
      setUpdating(false);
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

      {/* Puppeteer Browser Settings */}
      <div className="bg-[#1A1D27] border border-[#2D3348] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Cookie className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">浏览器自动抓取</h3>
        </div>
        <p className="text-sm text-[#94A3B8] mb-4">
          系统使用 Puppeteer 真实浏览器访问商品页面，提取实际显示的价格。
          首次使用时需要在浏览器中登录一次，之后登录态会自动保存。
        </p>
        <div className="p-4 rounded-lg bg-[#0F1117] border border-[#2D3348] space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-blue-400 font-bold text-lg shrink-0">1</span>
            <div>
              <p className="text-sm text-white font-medium">首次登录</p>
              <p className="text-xs text-[#94A3B8] mt-1">
                运行 <code className="px-1 py-0.5 bg-[#2D3348] rounded text-blue-300">pnpm dev</code> 后，
                系统会自动打开浏览器。在浏览器中登录京东/淘宝/唯品会。
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-400 font-bold text-lg shrink-0">2</span>
            <div>
              <p className="text-sm text-white font-medium">登录态保存</p>
              <p className="text-xs text-[#94A3B8] mt-1">
                登录后关闭浏览器窗口，登录态会保存在 <code className="px-1 py-0.5 bg-[#2D3348] rounded text-blue-300">data/browser-profile/</code> 目录。
                下次抓取时自动复用，无需重新登录。
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-400 font-bold text-lg shrink-0">3</span>
            <div>
              <p className="text-sm text-white font-medium">开始监控</p>
              <p className="text-xs text-[#94A3B8] mt-1">
                添加商品后点击「立即检查」，系统会用真实浏览器访问商品页面，提取实际价格。
                价格不准？检查浏览器是否已登录对应平台。
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-300">
            <strong>注意：</strong>Cookie 过期或登录失效时，抓取会返回错误（不再使用模拟数据）。
            此时需要重新在浏览器中登录。登录态有效期通常为 7-30 天。
          </p>
        </div>

        {/* Login Buttons */}
        <div className="mt-4 space-y-3">
          <p className="text-sm text-white font-medium">登录平台（首次使用必须）</p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleLogin('jd')}
              disabled={loggingIn}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loggingIn ? '打开中...' : '登录京东'}
            </button>
            <button
              onClick={() => handleLogin('taobao')}
              disabled={loggingIn}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loggingIn ? '打开中...' : '登录淘宝'}
            </button>
            <button
              onClick={() => handleLogin('vip')}
              disabled={loggingIn}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loggingIn ? '打开中...' : '登录唯品会'}
            </button>
          </div>
          {loginResult && (
            <div className={`p-3 rounded-lg text-sm ${loginResult.success ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}>
              {loginResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Update Section */}
      <div className="bg-[#1A1D27] border border-[#2D3348] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">程序更新</h3>
        <p className="text-sm text-[#94A3B8] mb-4">
          点击「检查更新」从 GitHub 仓库拉取最新代码。更新完成后需要重启程序。
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleUpdate}
            disabled={updating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {updating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                更新中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                检查更新
              </>
            )}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#2D3348] hover:bg-[#3D4460] text-white text-sm font-medium rounded-lg transition-colors"
          >
            重启程序
          </button>
        </div>
        {updateResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${updateResult.success ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}>
            {updateResult.message}
          </div>
        )}
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
