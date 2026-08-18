import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PriceGuard - 电商价格监控',
  description: '智能监控淘宝、京东、唯品会商品价格，达到目标价自动邮件提醒',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-[#0F1117] text-[#E2E8F0] min-h-screen">
        {children}
      </body>
    </html>
  );
}
