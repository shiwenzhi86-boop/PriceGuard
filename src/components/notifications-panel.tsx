'use client';

import { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertTriangle, TrendingDown, TrendingUp, XCircle, Loader2 } from 'lucide-react';

interface Notification {
  id: string;
  productId: string;
  type: 'price_reached' | 'price_drop' | 'price_rise' | 'error';
  message: string;
  currentPrice: number;
  targetPrice: number;
  sentAt: string;
  success: boolean;
}

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
      }
    } catch (error) {
      console.error('获取通知记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'price_reached':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'price_drop':
        return <TrendingDown className="w-4 h-4 text-blue-400" />;
      case 'price_rise':
        return <TrendingUp className="w-4 h-4 text-red-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Bell className="w-4 h-4 text-[#94A3B8]" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'price_reached': return '达到目标';
      case 'price_drop': return '价格下降';
      case 'price_rise': return '价格上涨';
      case 'error': return '监控异常';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'price_reached': return 'text-emerald-400';
      case 'price_drop': return 'text-blue-400';
      case 'price_rise': return 'text-red-400';
      case 'error': return 'text-red-400';
      default: return 'text-[#94A3B8]';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        <span className="ml-3 text-[#94A3B8]">加载通知记录...</span>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-[#1A1D27] flex items-center justify-center mb-4">
          <Bell className="w-8 h-8 text-[#94A3B8]" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">暂无通知记录</h3>
        <p className="text-sm text-[#94A3B8]">当商品价格变动或达到目标价时，通知会显示在这里</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">通知记录</h2>
        <span className="text-sm text-[#94A3B8]">共 {notifications.length} 条</span>
      </div>

      <div className="space-y-2">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className="flex items-start gap-3 p-4 bg-[#1A1D27] border border-[#2D3348] rounded-lg hover:border-[#3D4358] transition-colors"
          >
            <div className="mt-0.5 shrink-0">
              {getIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium ${getTypeColor(notification.type)}`}>
                  {getTypeLabel(notification.type)}
                </span>
                {notification.type === 'price_reached' && notification.success && (
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    已发邮件
                  </span>
                )}
                {notification.type === 'price_reached' && !notification.success && (
                  <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    <AlertTriangle className="w-3 h-3" /> 邮件未发送
                  </span>
                )}
              </div>
              <p className="text-sm text-white">{notification.message}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-[#94A3B8]">
                <span>当前: <span className="text-white tabular-nums">¥{notification.currentPrice.toFixed(2)}</span></span>
                <span>目标: <span className="text-blue-400 tabular-nums">¥{notification.targetPrice.toFixed(2)}</span></span>
              </div>
            </div>
            <span className="text-xs text-[#94A3B8] shrink-0">{formatTime(notification.sentAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
