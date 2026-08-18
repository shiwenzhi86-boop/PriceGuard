# AGENTS.md - 电商价格监控系统

## 项目概览

PriceGuard 是一个电商价格监控系统，支持淘宝、京东、唯品会三个平台。用户可以添加商品、设置目标价格，系统定时抓取价格并在达到目标价时发送邮件提醒。

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **Database**: SQLite (better-sqlite3)
- **Email**: Nodemailer (SMTP)

## 目录结构

```
src/
├── app/
│   ├── api/
│   │   ├── products/
│   │   │   ├── route.ts          # GET 列表 / POST 添加
│   │   │   └── [id]/
│   │   │       ├── route.ts      # GET 详情 / PUT 更新 / DELETE 删除
│   │   │       └── history/
│   │   │           └── route.ts  # GET 价格历史
│   │   ├── monitor/
│   │   │   └── route.ts          # GET 监控状态 / POST 执行监控
│   │   ├── config/
│   │   │   └── route.ts          # GET 配置 / PUT 更新 / POST 测试邮件
│   │   └── notifications/
│   │       └── route.ts          # GET 通知记录
│   ├── page.tsx                  # 主页面（商品列表/通知/设置）
│   ├── layout.tsx                # 根布局
│   └── globals.css               # 全局样式（深色主题）
├── components/
│   ├── product-card.tsx          # 商品卡片组件
│   ├── add-product-dialog.tsx    # 添加商品弹窗
│   ├── settings-panel.tsx        # 系统设置面板
│   ├── notifications-panel.tsx   # 通知记录面板
│   ├── price-chart.tsx           # 价格趋势图表
│   └── ui/                      # shadcn/ui 组件库
└── lib/
    ├── types.ts                  # 类型定义 + 平台识别工具
    ├── db.ts                     # SQLite 数据库层（DAO）
    ├── scraper.ts                # 价格抓取引擎（模拟）
    ├── email.ts                  # 邮件通知模块
    └── utils.ts                  # 通用工具函数
```

## 开发命令

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 构建生产版本
pnpm start        # 启动生产服务器
pnpm ts-check     # TypeScript 类型检查
pnpm lint         # ESLint 检查
```

## API 接口

| 路径 | 方法 | 说明 |
|------|------|------|
| /api/products | GET | 获取所有监控商品 |
| /api/products | POST | 添加监控商品 |
| /api/products/[id] | GET | 获取商品详情+价格历史 |
| /api/products/[id] | PUT | 更新商品信息/状态 |
| /api/products/[id] | DELETE | 删除监控商品 |
| /api/products/[id]/history | GET | 获取价格历史记录 |
| /api/monitor | GET | 获取监控统计状态 |
| /api/monitor | POST | 手动触发一次价格检查 |
| /api/config | GET | 获取系统配置 |
| /api/config | PUT | 更新系统配置 |
| /api/config | POST | 测试邮件连接 |
| /api/notifications | GET | 获取通知记录 |

## 数据库

SQLite 数据库文件位于 `data/price_monitor.db`，包含以下表：
- `products` - 监控商品
- `price_records` - 价格历史记录
- `notification_records` - 通知记录
- `system_config` - 系统配置

## 注意事项

- 价格抓取引擎当前为模拟实现，接入真实爬虫需修改 `src/lib/scraper.ts`
- 邮件通知需要配置 SMTP 信息（系统设置页面）
- 数据库使用 WAL 模式，支持并发读写
