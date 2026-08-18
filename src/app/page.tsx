'use client';

import { useState, useEffect, useCallback } from 'react';
import { Product, PLATFORM_INFO, type Platform } from '@/lib/types';
import { ProductCard } from '@/components/product-card';
import { AddProductDialog } from '@/components/add-product-dialog';
import { SettingsPanel } from '@/components/settings-panel';
import { NotificationsPanel } from '@/components/notifications-panel';
import { PriceChart } from '@/components/price-chart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  BarChart3,
  Bell,
  Plus,
  RefreshCw,
  Settings,
  ShoppingBag,
  Search,
  Activity,
} from 'lucide-react';

type Tab = 'products' | 'notifications' | 'settings';
type StatusFilter = 'all' | 'active' | 'target_reached' | 'error' | 'paused';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, targetReached: 0, error: 0, paused: 0 });

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error('获取商品列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/monitor');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('获取监控状态失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchStats();
  }, [fetchProducts, fetchStats]);

  const runMonitor = async () => {
    setMonitoring(true);
    try {
      const res = await fetch('/api/monitor', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchProducts();
        await fetchStats();
      }
    } catch (error) {
      console.error('监控执行失败:', error);
    } finally {
      setMonitoring(false);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await fetchProducts();
        await fetchStats();
      }
    } catch (error) {
      console.error('删除商品失败:', error);
    }
  };

  const updateProductStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchProducts();
        await fetchStats();
      }
    } catch (error) {
      console.error('更新状态失败:', error);
    }
  };

  const viewPriceHistory = (product: Product) => {
    setSelectedProduct(product);
    setShowChart(true);
  };

  const filteredProducts = products.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !p.url.includes(searchQuery)) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return { label: '监控中', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'target_reached': return { label: '已达目标', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      case 'error': return { label: '异常', className: 'bg-red-500/20 text-red-400 border-red-500/30' };
      case 'paused': return { label: '已暂停', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
      default: return { label: status, className: '' };
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1117]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#2D3348] bg-[#0F1117]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-400" />
              </div>
              <h1 className="text-lg font-semibold text-white">PriceGuard</h1>
              <Badge variant="outline" className="text-xs border-[#2D3348] text-[#94A3B8]">
                电商价格监控
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={runMonitor}
                disabled={monitoring || products.length === 0}
                className="border-[#2D3348] text-[#94A3B8] hover:text-white hover:bg-[#1A1D27]"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${monitoring ? 'animate-spin' : ''}`} />
                {monitoring ? '检查中...' : '立即检查'}
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAddDialog(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加商品
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="border-b border-[#2D3348] bg-[#1A1D27]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white tabular-nums">{stats.total}</div>
                <div className="text-xs text-[#94A3B8]">监控商品</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse-dot" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white tabular-nums">{stats.active}</div>
                <div className="text-xs text-[#94A3B8]">监控中</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white tabular-nums">{stats.targetReached}</div>
                <div className="text-xs text-[#94A3B8]">已达目标</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white tabular-nums">{stats.error}</div>
                <div className="text-xs text-[#94A3B8]">异常</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-[#2D3348]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1">
            {[
              { id: 'products' as Tab, label: '商品列表', icon: ShoppingBag },
              { id: 'notifications' as Tab, label: '通知记录', icon: Bell },
              { id: 'settings' as Tab, label: '系统设置', icon: Settings },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-400 text-blue-400'
                    : 'border-transparent text-[#94A3B8] hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'products' && (
          <div>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                <Input
                  placeholder="搜索商品名称或链接..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[#1A1D27] border-[#2D3348] text-white placeholder:text-[#94A3B8]"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'all', label: '全部' },
                  { value: 'active', label: '监控中' },
                  { value: 'target_reached', label: '已达目标' },
                  { value: 'error', label: '异常' },
                  { value: 'paused', label: '已暂停' },
                ].map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setStatusFilter(filter.value as StatusFilter)}
                    className={`px-3 py-2 text-xs rounded-md border transition-colors ${
                      statusFilter === filter.value
                        ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                        : 'border-[#2D3348] text-[#94A3B8] hover:text-white hover:border-[#3D4358]'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
                <span className="ml-3 text-[#94A3B8]">加载中...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-[#1A1D27] flex items-center justify-center mb-4">
                  <ShoppingBag className="w-8 h-8 text-[#94A3B8]" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">
                  {products.length === 0 ? '暂无监控商品' : '没有匹配的商品'}
                </h3>
                <p className="text-sm text-[#94A3B8] mb-4">
                  {products.length === 0
                    ? '添加商品开始监控价格变动'
                    : '尝试调整搜索条件或筛选器'}
                </p>
                {products.length === 0 && (
                  <Button onClick={() => setShowAddDialog(true)} className="bg-blue-500 hover:bg-blue-600 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    添加第一个商品
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(product => {
                  const badge = getStatusBadge(product.status);
                  const platformInfo = PLATFORM_INFO[product.platform as Platform];
                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      platformInfo={platformInfo}
                      statusBadge={badge}
                      onDelete={() => deleteProduct(product.id)}
                      onPause={() => updateProductStatus(product.id, product.status === 'paused' ? 'active' : 'paused')}
                      onViewChart={() => viewPriceHistory(product)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifications' && <NotificationsPanel />}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>

      {/* Add Product Dialog */}
      {showAddDialog && (
        <AddProductDialog
          onClose={() => setShowAddDialog(false)}
          onAdded={() => {
            setShowAddDialog(false);
            fetchProducts();
            fetchStats();
          }}
        />
      )}

      {/* Price Chart Dialog */}
      {showChart && selectedProduct && (
        <PriceChart
          product={selectedProduct}
          onClose={() => {
            setShowChart(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
}
