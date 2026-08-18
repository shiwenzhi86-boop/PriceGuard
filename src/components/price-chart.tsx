'use client';

import { useState, useEffect } from 'react';
import type { Product, PriceRecord } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';

interface PriceChartProps {
  product: Product;
  onClose: () => void;
}

export function PriceChart({ product, onClose }: PriceChartProps) {
  const [history, setHistory] = useState<PriceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [product.id]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/products/${product.id}/history`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.data.reverse()); // 按时间正序
      }
    } catch (error) {
      console.error('获取价格历史失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const minPrice = history.length > 0 ? Math.min(...history.map(h => h.finalPrice)) : 0;
  const maxPrice = history.length > 0 ? Math.max(...history.map(h => h.finalPrice)) : 0;
  const priceRange = maxPrice - minPrice || 1;

  // 生成 SVG 折线图
  const chartWidth = 600;
  const chartHeight = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const points = history.map((record, index) => {
    const x = padding.left + (index / Math.max(history.length - 1, 1)) * innerWidth;
    const y = padding.top + innerHeight - ((record.finalPrice - minPrice) / priceRange) * innerHeight;
    return { x, y, record };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = linePath + ` L ${points[points.length - 1]?.x || padding.left} ${padding.top + innerHeight} L ${padding.left} ${padding.top + innerHeight} Z`;

  // Y 轴刻度
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => minPrice + (priceRange * i) / (yTicks - 1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#1A1D27] border border-[#2D3348] rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2D3348]">
          <div>
            <h2 className="text-lg font-semibold text-white">{product.name}</h2>
            <p className="text-sm text-[#94A3B8]">价格趋势</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#94A3B8]" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              <span className="ml-3 text-[#94A3B8]">加载价格历史...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-[#94A3B8]">暂无价格历史记录</p>
              <p className="text-sm text-[#94A3B8] mt-1">执行价格检查后将自动生成记录</p>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-[#0F1117] rounded-lg p-3">
                  <div className="text-xs text-[#94A3B8] mb-1">当前价</div>
                  <div className="text-lg font-bold text-white tabular-nums">
                    ¥{history[history.length - 1]?.finalPrice.toFixed(2)}
                  </div>
                </div>
                <div className="bg-[#0F1117] rounded-lg p-3">
                  <div className="text-xs text-[#94A3B8] mb-1">最低价</div>
                  <div className="text-lg font-bold text-emerald-400 tabular-nums">
                    ¥{minPrice.toFixed(2)}
                  </div>
                </div>
                <div className="bg-[#0F1117] rounded-lg p-3">
                  <div className="text-xs text-[#94A3B8] mb-1">最高价</div>
                  <div className="text-lg font-bold text-red-400 tabular-nums">
                    ¥{maxPrice.toFixed(2)}
                  </div>
                </div>
                <div className="bg-[#0F1117] rounded-lg p-3">
                  <div className="text-xs text-[#94A3B8] mb-1">目标价</div>
                  <div className="text-lg font-bold text-blue-400 tabular-nums">
                    ¥{product.targetPrice.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-[#0F1117] rounded-lg p-4 border border-[#2D3348]">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
                  {/* Grid lines */}
                  {yTickValues.map((val, i) => {
                    const y = padding.top + innerHeight - ((val - minPrice) / priceRange) * innerHeight;
                    return (
                      <g key={i}>
                        <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="#2D3348" strokeWidth="1" />
                        <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="#94A3B8" fontSize="10">
                          ¥{val.toFixed(0)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Target price line */}
                  {product.targetPrice >= minPrice && product.targetPrice <= maxPrice && (
                    <g>
                      <line
                        x1={padding.left}
                        y1={padding.top + innerHeight - ((product.targetPrice - minPrice) / priceRange) * innerHeight}
                        x2={chartWidth - padding.right}
                        y2={padding.top + innerHeight - ((product.targetPrice - minPrice) / priceRange) * innerHeight}
                        stroke="#3B82F6"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={chartWidth - padding.right + 4}
                        y={padding.top + innerHeight - ((product.targetPrice - minPrice) / priceRange) * innerHeight + 4}
                        fill="#3B82F6"
                        fontSize="10"
                      >
                        目标
                      </text>
                    </g>
                  )}

                  {/* Area fill */}
                  <path d={areaPath} fill="url(#areaGradient)" opacity="0.3" />

                  {/* Line */}
                  <path d={linePath} fill="none" stroke="#3B82F6" strokeWidth="2" />

                  {/* Points */}
                  {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3" fill="#3B82F6" stroke="#1A1D27" strokeWidth="2" />
                  ))}

                  {/* X axis labels */}
                  {history.length > 1 && [0, Math.floor(history.length / 2), history.length - 1].map(idx => {
                    const x = padding.left + (idx / (history.length - 1)) * innerWidth;
                    const date = new Date(history[idx].checkedAt);
                    return (
                      <text key={idx} x={x} y={chartHeight - 5} textAnchor="middle" fill="#94A3B8" fontSize="10">
                        {`${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`}
                      </text>
                    );
                  })}

                  {/* Gradient definition */}
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* History Table */}
              <div className="mt-4 max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#1A1D27]">
                    <tr className="text-xs text-[#94A3B8]">
                      <th className="text-left py-2 px-2">时间</th>
                      <th className="text-right py-2 px-2">原价</th>
                      <th className="text-right py-2 px-2">优惠</th>
                      <th className="text-right py-2 px-2">到手价</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map(record => (
                      <tr key={record.id} className="border-t border-[#2D3348]">
                        <td className="py-2 px-2 text-[#94A3B8]">
                          {new Date(record.checkedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2 px-2 text-right text-[#94A3B8] tabular-nums">
                          ¥{record.price.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-emerald-400 tabular-nums">
                          -¥{((record.couponDiscount || 0) + (record.promotionDiscount || 0) + (record.discount || 0)).toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-white font-medium tabular-nums">
                          ¥{record.finalPrice.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
