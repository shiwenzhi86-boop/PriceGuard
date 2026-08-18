'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, TestTube, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  toEmail: string;
  enabled: boolean;
}

interface SystemConfig {
  id: string;
  defaultCheckInterval: number;
  maxProducts: number;
  emailConfig: EmailConfig;
  updatedAt: string;
}

export function SettingsPanel() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  const handleTestEmail = async () => {
    if (!config) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailConfig: config.emailConfig }),
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

          {/* Test Email */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestEmail}
              disabled={testing || !config.emailConfig.smtpHost}
              className="border-[#2D3348] text-[#94A3B8]"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4 mr-2" />
              )}
              测试连接
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
