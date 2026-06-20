# 个人记账系统项目说明

## 1. 项目目标

本项目是一个个人记账系统。

最终目标是：

- 在 Windows 主力电脑上进行开发。
- 使用 Codex 辅助代码编写、重构、测试和文档整理。
- 通过 Git 将代码推送到 Debian 老主机。
- 在 Debian 老主机上部署后端、前端和数据库。
- 前端完成后，通过个人域名在浏览器中直接访问系统。
- PostgreSQL 数据库只在 Debian 主机本机访问，不暴露到局域网或公网。
- 项目第一版以稳定、可维护、可扩展为主，不追求一次性做成复杂系统。

本项目需要分阶段推进，不要一次性生成完整大系统。

------

## 2. 当前基础设施状态

### Debian 服务器

服务器信息：

```text
SSH Host: zhouyou
服务器 IP: 10.168.5.121
服务器用户: zzy
系统: Debian
```

已完成配置：

```text
Docker 已安装
Docker Compose 已可用
UFW 防火墙已启用
UFW 当前只允许 OpenSSH
cron 已启用并正在运行
系统时区为 Asia/Shanghai
```

注意：

```text
不要随意开放数据库端口 5432。
不要随意关闭 UFW。
不要删除 PostgreSQL 数据目录。
不要删除备份目录。
```

------

## 3. PostgreSQL 数据库状态

PostgreSQL 已经通过 Docker Compose 部署在 Debian 主机上。

数据库服务目录：

```text
/home/zzy/services/accounting-db/
```

目录结构：

```text
/home/zzy/services/accounting-db/
├── docker-compose.yml
├── .env
├── data/
└── backups/
```

容器信息：

```text
容器名: accounting-postgres
镜像: postgres:16
PostgreSQL 版本: 16.14
数据库名: accounting_db
数据库用户: accounting
```

端口映射：

```text
127.0.0.1:5432 -> 5432
```

这表示 PostgreSQL 只绑定在 Debian 主机本机的 `127.0.0.1`，不会直接暴露给局域网或公网。

这是有意设计，不要改成：

```text
0.0.0.0:5432->5432
```

也不要执行：

```bash
sudo ufw allow 5432
```

除非用户明确要求并确认风险。

------

## 4. 数据库备份状态

备份脚本位置：

```text
/home/zzy/scripts/backup-accounting-db.sh
```

备份目录：

```text
/home/zzy/services/accounting-db/backups/
```

当前 crontab 定时任务：

```cron
0 3 * * * /home/zzy/scripts/backup-accounting-db.sh >> /home/zzy/services/accounting-db/backups/backup.log 2>&1
```

含义：

```text
每天凌晨 03:00 自动执行 PostgreSQL 备份。
备份输出和错误日志写入 backup.log。
```

注意：

```text
不要删除 backups 目录。
不要把备份文件提交到 Git。
不要把 .env 提交到 Git。
```

------

## 5. Windows 本地开发连接数据库的方式

Windows 本地开发时，不直接访问 Debian 的 5432 端口，而是通过 SSH 隧道连接。

在 Windows PowerShell 中执行：

```powershell
ssh -N -L 5433:127.0.0.1:5432 zhouyou
```

这个窗口没有输出是正常的，需要保持打开。

隧道含义：

```text
Windows 127.0.0.1:5433
    ↓
SSH 隧道
    ↓
Debian 127.0.0.1:5432
    ↓
PostgreSQL 容器 accounting-postgres
```

Windows 本地开发时使用的数据库连接串：

```env
DATABASE_URL=postgresql://accounting:<数据库密码>@127.0.0.1:5433/accounting_db
```

当后端部署到 Debian 主机上运行时，应使用：

```env
DATABASE_URL=postgresql://accounting:<数据库密码>@127.0.0.1:5432/accounting_db
```

不要把真实数据库密码写入代码仓库。项目中只提交 `.env.example`，真实 `.env` 文件只保存在本地和服务器。

------

## 6. 推荐技术栈

后端：

```text
Python
FastAPI
SQLAlchemy 2.x
Alembic
Pydantic
PostgreSQL
```

前端：

```text
React
Vite
TypeScript
```

部署：

```text
Docker Compose
后续使用 Nginx / Caddy / Nginx Proxy Manager 做反向代理
最终通过 HTTPS 域名访问
```

数据库客户端：

```text
Windows 上推荐使用 DBeaver Community 连接 PostgreSQL
```

------

## 7. 部署目标架构

最终访问链路：

```text
用户浏览器
    ↓
https://用户域名
    ↓
Debian 主机 80/443
    ↓
反向代理 Nginx / Caddy / Nginx Proxy Manager
    ↓
前端页面
    ↓
后端 API
    ↓
PostgreSQL 数据库
```

数据库不对外开放。公网只应该开放：

```text
80
443
```

SSH 只用于用户自己远程管理服务器。

------

## 8. 第一版功能范围

第一版目标是做一个个人使用的记账 MVP。

必须实现：

```text
账户管理
分类管理
收入记录
支出记录
转账记录
交易流水查询
按月统计
按分类统计
按账户统计
CSV 导出
```

第一版暂时不要实现：

```text
多人协作
多租户 SaaS
复杂权限系统
OCR 发票识别
微信/支付宝自动同步
银行自动同步
AI 自动分类
投资组合管理
复杂数据大屏
公开注册系统
```

系统要先做小、做稳、做清楚。

------

## 9. 核心数据库模型设计

第一版建议使用以下核心表：

```text
users
accounts
categories
transactions
transaction_entries
```

即使第一版只有一个用户，也建议保留 `users` 表和 `user_id` 字段，方便后续扩展。

------

### 9.1 users 用户表

字段建议：

```text
id
username
email
password_hash
created_at
updated_at
```

第一版可以先不做复杂登录，但数据模型中保留用户概念。

------

### 9.2 accounts 账户表

账户表示钱所在的位置，例如：

```text
现金
微信
支付宝
银行卡
信用卡
花呗
其他账户
```

字段建议：

```text
id
user_id
name
type
currency
initial_balance
is_active
created_at
updated_at
```

账户类型建议：

```text
cash
bank
wechat
alipay
credit_card
other
```

注意：

```text
不要把一个可变的 balance 字段作为余额的唯一真实来源。
```

账户当前余额应该由：

```text
initial_balance + transaction_entries.amount 求和
```

计算得出。

------

### 9.3 categories 分类表

分类用于收入和支出的分类，例如：

```text
餐饮
交通
购物
工资
房租
娱乐
医疗
学习
其他
```

字段建议：

```text
id
user_id
name
type
parent_id
sort_order
is_active
created_at
updated_at
```

分类类型：

```text
income
expense
```

`parent_id` 用于后续支持二级分类。第一版可以只实现一级分类，但字段可以预留。

------

### 9.4 transactions 交易主表

交易主表表示“一次记账事件”。

字段建议：

```text
id
user_id
kind
category_id
occurred_on
merchant
note
created_at
updated_at
```

交易类型：

```text
income
expense
transfer
adjustment
```

示例：

```text
2026-06-19 午饭支出 25 元
2026-06-20 工资收入 5000 元
2026-06-21 从银行卡转账 1000 元到支付宝
```

这些都应该是 `transactions` 表中的一条记录。

------

### 9.5 transaction_entries 交易明细表

交易明细表记录一笔交易对账户余额的影响。

字段建议：

```text
id
transaction_id
account_id
amount
currency
created_at
```

规则：

```text
收入：一条正数 entry
支出：一条负数 entry
转账：一条转出账户负数 entry + 一条转入账户正数 entry
余额调整：一条正数或负数 entry
```

示例：

支出 25 元：

```text
transaction.kind = expense
entry.account = 支付宝
entry.amount = -25.00
```

收入 5000 元：

```text
transaction.kind = income
entry.account = 招商银行
entry.amount = +5000.00
```

银行卡转账 1000 元到支付宝：

```text
transaction.kind = transfer
entry.account = 招商银行
entry.amount = -1000.00

entry.account = 支付宝
entry.amount = +1000.00
```

金额字段必须使用：

```text
PostgreSQL: NUMERIC(14,2)
Python: Decimal
```

不要用 float 存钱。

------

## 10. 第一版 API 设计

建议先实现后端 API，不急着做前端。

基础接口：

```text
GET    /health
```

账户接口：

```text
GET    /accounts
POST   /accounts
PATCH  /accounts/{id}
DELETE /accounts/{id}
```

分类接口：

```text
GET    /categories
POST   /categories
PATCH  /categories/{id}
DELETE /categories/{id}
```

交易接口：

```text
GET    /transactions
POST   /transactions
GET    /transactions/{id}
PATCH  /transactions/{id}
DELETE /transactions/{id}
```

统计接口：

```text
GET    /reports/monthly
GET    /reports/categories
GET    /reports/accounts
```

第一阶段先保证 API 正确、数据库模型清晰、测试可运行，再做前端页面。

------

## 11. 开发规则

后续由 Codex 辅助开发时，必须遵守以下规则：

```text
保持代码简单。
不要过度抽象。
不要一次性生成整个系统。
每次只完成一个小阶段。
重要修改前先说明计划。
涉及数据库结构变化时必须使用 Alembic migration。
涉及删除数据、重置数据库、删除 volume 的操作必须先询问用户。
不要提交 .env。
不要提交数据库备份文件。
不要提交 Docker volume 数据。
不要把数据库密码写死在代码中。
不要开放 PostgreSQL 5432 端口。
```

优先保证：

```text
可读性
可维护性
可测试性
数据安全
备份可靠
```

------

## 12. 建议的第一阶段 Codex 任务

第一阶段只创建后端项目骨架，不实现全部业务。

任务目标：

```text
创建 FastAPI 后端项目骨架。
连接 PostgreSQL 的配置从环境变量读取。
准备 SQLAlchemy 2.x 基础配置。
初始化 Alembic。
创建基础目录结构。
创建 /health 接口。
创建 .env.example。
创建 README 的本地开发说明。
不要实现完整业务逻辑。
```

建议目录结构：

```text
accounting-system/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── database.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── api/
│   │   │   └── routes/
│   │   └── services/
│   ├── alembic/
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
├── frontend/
└── README.md
```

第一阶段验收标准：

```text
后端可以本地启动。
/health 返回正常。
数据库连接配置可以从 .env 读取。
Alembic 已初始化。
项目没有提交任何真实密码。
README 中说明了如何通过 SSH 隧道连接 Debian PostgreSQL。
```

------

## 13. 建议的后续阶段

第二阶段：

```text
实现 SQLAlchemy 数据模型：
users
accounts
categories
transactions
transaction_entries
```

第三阶段：

```text
创建 Alembic migration。
在 PostgreSQL 中生成表结构。
```

第四阶段：

```text
实现 accounts 和 categories API。
```

第五阶段：

```text
实现 transactions API。
重点测试 income、expense、transfer 三种交易。
```

第六阶段：

```text
实现 reports API。
包括账户余额、月度统计、分类统计。
```

第七阶段：

```text
再开始 React + Vite 前端。
```

第八阶段：

```text
将后端和前端 Docker 化。
通过 Git 推送到 Debian 部署。
```

第九阶段：

```text
配置域名、HTTPS 和反向代理。
浏览器可以通过域名访问系统。
```