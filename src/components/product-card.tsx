'use client';

import type { Product } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Trash2, Pause, Play, TrendingDown, TrendingUp, BarChart3 } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  platformInfo: { name: string; color: string; icon: string };
  statusBadge: { label: string; className: string };
  onDelete: () => void;
  onPause: () => void;
  onViewChart: () => void;
}

export function ProductCard({ product, platformInfo, statusBadge, onDelete, onPause, onViewChart }: ProductCardProps) {
  const priceDiff = product.currentPrice && product.targetPrice
    ? product.currentPrice - product.targetPrice
    : null;
  const priceDiffPercent = priceDiff && product.targetPrice
    ? ((priceDiff / product.targetPrice) * 100).toFixed(1)
    : null;
  const isBelowTarget = priceDiff !== null && priceDiff <= 0;
  const isCloseToTarget = priceDiff !== null && priceDiff > 0 && priceDiffPercent && parseFloat(priceDiffPercent) <= 10;

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '从未';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}小时前`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}天前`;
  };

  return (
    <Card className="bg-[#1A1D27] border-[#2D3348] hover:border-[#3D4358] transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-medium shrink-0"
              style={{ backgroundColor: `${platformInfo.color}20`, color: platformInfo.color }}
            >
              {platformInfo.icon}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-white truncate">{product.name}</h3>
              <span className="text-xs text-[#94A3B8]">{platformInfo.name}</span>
            </div>
          </div>
          <Badge variant="outline" className={`text-xs shrink-0 ${statusBadge.className}`}>
            {product.status === 'active' && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1 animate-pulse-dot" />
            )}
            {product.status === 'target_reached' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1" />
            )}
            {product.status === 'error' && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-1 animate-blink" />
            )}
            {statusBadge.label}
          </Badge>
        </div>

        {/* Price Info */}
        <div className="bg-[#0F1117] rounded-lg p-3 mb-3">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs text-[#94A3B8] mb-1">当前价格</div>
              <div className={`text-2xl font-bold tabular-nums ${
                isBelowTarget ? 'text-emerald-400' : isCloseToTarget ? 'text-amber-400' : 'text-white'
              }`}>
                {product.currentPrice !== null ? `¥${product.currentPrice.toFixed(2)}` : '--'}
              </div>
            </div>
            {priceDiff !== null && priceDiffPercent && (
              <div className={`flex items-center gap-1 text-xs ${
                isBelowTarget ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {isBelowTarget ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                <span>{isBelowTarget ? '' : '+'}{priceDiffPercent}%</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#2D3348]">
            <div>
              <span className="text-xs text-[#94A3B8]">目标价 </span>
              <span className="text-sm font-medium text-blue-400 tabular-nums">¥{product.targetPrice.toFixed(2)}</span>
            </div>
            {product.originalPrice && (
              <div>
                <span className="text-xs text-[#94A3B8]">原价 </span>
                <span className="text-sm text-[#94A3B8] line-through tabular-nums">¥{product.originalPrice.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#94A3B8]">
            上次检查: {formatTime(product.lastCheckedAt)}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[#94A3B8] hover:text-blue-400 hover:bg-blue-500/10"
              onClick={() => window.open(product.url, '_blank')}
              title="打开链接"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[#94A3B8] hover:text-blue-400 hover:bg-blue-500/10"
              onClick={onViewChart}
              title="价格趋势"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[#94A3B8] hover:text-amber-400 hover:bg-amber-500/10"
              onClick={onPause}
              title={product.status === 'paused' ? '恢复监控' : '暂停监控'}
            >
              {product.status === 'paused' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10"
              onClick={onDelete}
              title="删除"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
