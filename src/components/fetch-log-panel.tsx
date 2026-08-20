'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Trash2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface FetchLog {
  timestamp: string;
  productId: string;
  productName: string;
  platform: string;
  status: 'SUCCESS' | 'FAILED' | 'AUTH_REQUIRED';
  message: string;
  price?: number;
  targetPrice?: number;
}

const STATUS_CONFIG = {
  SUCCESS: { color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle, label: '成功' },
  FAILED: { color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: XCircle, label: '失败' },
  AUTH_REQUIRED: { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: AlertTriangle, label: '需要登录' },
};

const PLATFORM_NAMES: Record<string, string> = {
  jd: '京东',
  taobao: '淘宝',
  vipshop: '唯品会',
};

export function FetchLogPanel() {
  const [logs, setLogs] = useState<FetchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (platformFilter !== 'all') params.set('platform', platformFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/fetch-logs?${params}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data);
      }
    } catch (error) {
      console.error('获取抓取日志失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!confirm('确定要清空所有抓取日志吗？')) return;

    try {
      const response = await fetch('/api/fetch-logs', { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        setLogs([]);
      }
    } catch (error) {
      console.error('清空日志失败:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [platformFilter, statusFilter]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>抓取日志</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="平台" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部平台</SelectItem>
                <SelectItem value="jd">京东</SelectItem>
                <SelectItem value="taobao">淘宝</SelectItem>
                <SelectItem value="vipshop">唯品会</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="SUCCESS">成功</SelectItem>
                <SelectItem value="FAILED">失败</SelectItem>
                <SelectItem value="AUTH_REQUIRED">需要登录</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>

            <Button variant="destructive" size="sm" onClick={clearLogs}>
              <Trash2 className="w-4 h-4 mr-2" />
              清空
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            暂无抓取日志
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">时间</TableHead>
                <TableHead>商品</TableHead>
                <TableHead className="w-[100px]">平台</TableHead>
                <TableHead className="w-[100px]">状态</TableHead>
                <TableHead className="w-[100px]">价格</TableHead>
                <TableHead>信息</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log, index) => {
                const statusConfig = STATUS_CONFIG[log.status];
                const StatusIcon = statusConfig.icon;

                return (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-xs">
                      {formatTime(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{log.productName || '未知商品'}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {log.productId}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {PLATFORM_NAMES[log.platform] || log.platform}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {log.price ? `¥${log.price.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.message}
                      {log.targetPrice && log.price && (
                        <div className="text-xs mt-1">
                          目标价：¥{log.targetPrice.toFixed(2)}
                          {log.price <= log.targetPrice && (
                            <span className="text-green-500 ml-2">✓ 已达标</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
