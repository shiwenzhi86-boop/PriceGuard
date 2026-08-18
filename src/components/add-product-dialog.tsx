'use client';

import { useState } from 'react';
import { detectPlatform, PLATFORM_INFO, type Platform } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Link as LinkIcon, AlertCircle } from 'lucide-react';

interface AddProductDialogProps {
  onClose: () => void;
  onAdded: () => void;
}

export function AddProductDialog({ onClose, onAdded }: AddProductDialogProps) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [checkInterval, setCheckInterval] = useState('60');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const detectedPlatform = url ? detectPlatform(url) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url) {
      setError('请输入商品链接');
      return;
    }

    if (!detectedPlatform) {
      setError('无法识别商品平台，请检查链接是否正确');
      return;
    }

    const price = parseFloat(targetPrice);
    if (!targetPrice || isNaN(price) || price <= 0) {
      setError('请输入有效的目标价格');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          name: name || undefined,
          targetPrice: price,
          checkInterval: parseInt(checkInterval) || 60,
        }),
      });
      const data = await res.json();

      if (data.success) {
        onAdded();
      } else {
        setError(data.error || '添加失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const platformExamples: Record<Platform, string> = {
    taobao: 'https://item.taobao.com/item.htm?id=123456789',
    jd: 'https://item.jd.com/100012345.html',
    vipshop: 'https://detail.vip.com/detail-123456-789.html',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#1A1D27] border border-[#2D3348] rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2D3348]">
          <h2 className="text-lg font-semibold text-white">添加监控商品</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#94A3B8]" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm text-[#94A3B8]">商品链接 *</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
              <Input
                placeholder="粘贴淘宝/京东/唯品会商品链接"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="pl-10 bg-[#0F1117] border-[#2D3348] text-white placeholder:text-[#94A3B8]"
              />
            </div>
            {detectedPlatform && (
              <div className="flex items-center gap-2 text-xs">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md"
                  style={{
                    backgroundColor: `${PLATFORM_INFO[detectedPlatform].color}20`,
                    color: PLATFORM_INFO[detectedPlatform].color,
                  }}
                >
                  {PLATFORM_INFO[detectedPlatform].icon} {PLATFORM_INFO[detectedPlatform].name}
                </span>
                <span className="text-emerald-400">已识别</span>
              </div>
            )}
            {!detectedPlatform && url && (
              <p className="text-xs text-red-400">无法识别平台，请检查链接</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-[#94A3B8]">商品名称（可选）</Label>
            <Input
              placeholder="自定义商品名称，留空自动生成"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-[#0F1117] border-[#2D3348] text-white placeholder:text-[#94A3B8]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-[#94A3B8]">目标价格 (元) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="期望的目标价格"
              value={targetPrice}
              onChange={e => setTargetPrice(e.target.value)}
              className="bg-[#0F1117] border-[#2D3348] text-white placeholder:text-[#94A3B8]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-[#94A3B8]">检查间隔（分钟）</Label>
            <Input
              type="number"
              min="5"
              max="1440"
              placeholder="默认60分钟"
              value={checkInterval}
              onChange={e => setCheckInterval(e.target.value)}
              className="bg-[#0F1117] border-[#2D3348] text-white placeholder:text-[#94A3B8]"
            />
          </div>

          {/* Platform examples */}
          <div className="p-3 rounded-lg bg-[#0F1117] border border-[#2D3348]">
            <p className="text-xs text-[#94A3B8] mb-2">支持的链接格式：</p>
            <div className="space-y-1">
              {Object.entries(platformExamples).map(([key, example]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: PLATFORM_INFO[key as Platform].color }}>
                    {PLATFORM_INFO[key as Platform].icon} {PLATFORM_INFO[key as Platform].name}
                  </span>
                  <code className="text-xs text-[#94A3B8] truncate">{example}</code>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 border-[#2D3348] text-[#94A3B8]" onClick={onClose}>
              取消
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              disabled={loading}
            >
              {loading ? '添加中...' : '添加监控'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
