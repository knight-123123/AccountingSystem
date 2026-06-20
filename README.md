# Accounting System

个人记账系统，按阶段推进。

当前已完成：

- FastAPI 后端项目骨架
- PostgreSQL 环境变量配置
- SQLAlchemy 2.x 模型
- Alembic 初始建表 migration
- 账户、分类、交易、报表 API
- 交易 CSV 导出
- 开发用默认用户脚本

## 本地开发

后端代码在 `backend/` 目录。

本机使用 Anaconda 环境：

```powershell
& "C:\Users\zzy\anaconda3\Scripts\conda.exe" activate accounting-system
```

如果 PowerShell 无法直接 `conda activate`，可以使用：

```powershell
& "C:\Users\zzy\anaconda3\Scripts\conda.exe" run -n accounting-system python --version
```

Windows 本地开发连接 Debian PostgreSQL 时，先打开 SSH 隧道：

```powershell
ssh -N -L 5433:127.0.0.1:5432 zhouyou
```

然后在 `backend/.env` 中使用本地隧道端口：

```env
DATABASE_URL=postgresql+psycopg://accounting:<数据库密码>@127.0.0.1:5433/accounting_db
```

后端部署到 Debian 主机后，使用服务器本机端口：

```env
DATABASE_URL=postgresql+psycopg://accounting:<数据库密码>@127.0.0.1:5432/accounting_db
```

不要提交真实 `.env` 文件和数据库密码。

## 启动后端

```powershell
cd backend
& "C:\Users\zzy\anaconda3\Scripts\conda.exe" run -n accounting-system uvicorn app.main:app --reload
```

健康检查：

```text
GET http://127.0.0.1:8000/health
```

## 冒烟验证

后端启动后，可以运行一次基础 API 冒烟验证：

```powershell
cd backend
& "C:\Users\zzy\anaconda3\Scripts\conda.exe" run -n accounting-system python scripts\smoke_test_api.py
```

如需验证其他地址：

```powershell
& "C:\Users\zzy\anaconda3\Scripts\conda.exe" run -n accounting-system python scripts\smoke_test_api.py --base-url http://127.0.0.1:8000
```

## 数据库迁移

当前初始 migration 已创建并执行过。

后续修改数据库结构时：

```powershell
cd backend
& "C:\Users\zzy\anaconda3\Scripts\conda.exe" run -n accounting-system alembic revision --autogenerate -m "message"
& "C:\Users\zzy\anaconda3\Scripts\conda.exe" run -n accounting-system alembic upgrade head
```

检查模型和数据库结构是否一致：

```powershell
& "C:\Users\zzy\anaconda3\Scripts\conda.exe" run -n accounting-system alembic check
```

## 开发用默认用户

当前还没有登录和用户管理 API。为了本地测试，可以创建开发用默认用户：

```powershell
cd backend
& "C:\Users\zzy\anaconda3\Scripts\conda.exe" run -n accounting-system python scripts\create_dev_user.py
```

脚本可重复执行；如果 `username=dev` 已存在，不会重复创建。

## 当前 API

基础接口：

```text
GET /health
```

账户接口：

```text
GET    /accounts
POST   /accounts
PATCH  /accounts/{account_id}
DELETE /accounts/{account_id}
```

分类接口：

```text
GET    /categories
POST   /categories
PATCH  /categories/{category_id}
DELETE /categories/{category_id}
```

交易接口：

```text
GET  /transactions
POST /transactions
GET  /transactions/{transaction_id}
GET  /transactions/export.csv
```

报表接口：

```text
GET /reports/accounts
GET /reports/monthly
GET /reports/categories
```

说明：

- `DELETE /accounts/{account_id}` 和 `DELETE /categories/{category_id}` 当前是软删除，只修改 `is_active=false`。
- `POST /transactions` 支持 `income`、`expense`、`transfer`。
- CSV 导出是一条 `transaction_entry` 一行，转账会导出两行。
- 报表统计中，转账不计入收入/支出。

## 后续阶段

1. 根据需要补充交易修改/删除
2. 再开始 React + Vite 前端
3. Docker 化并部署到 Debian
