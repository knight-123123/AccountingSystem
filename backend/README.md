# Backend

FastAPI 后端。

## 安装依赖

本项目使用 Anaconda 环境 `accounting-system`。

```powershell
& "C:\Users\zzy\anaconda3\Scripts\conda.exe" run -n accounting-system python -m pip install -r requirements.txt
```

## 配置环境变量

复制示例配置：

```powershell
Copy-Item .env.example .env
```

Windows 本地开发时，先保持 SSH 隧道窗口打开：

```powershell
ssh -N -L 5433:127.0.0.1:5432 zhouyou
```

然后在 `.env` 中配置：

```env
DATABASE_URL=postgresql+psycopg://accounting:<数据库密码>@127.0.0.1:5433/accounting_db
```

部署到 Debian 主机后应改为：

```env
DATABASE_URL=postgresql+psycopg://accounting:<数据库密码>@127.0.0.1:5432/accounting_db
```

## 启动服务

```powershell
& "C:\Users\zzy\anaconda3\Scripts\conda.exe" run -n accounting-system uvicorn app.main:app --reload
```

访问：

```text
http://127.0.0.1:8000/health
```

预期返回：

```json
{"status":"ok"}
```

## Alembic

当前已有初始建表 migration。

后续新增或修改数据库表结构时，使用 Alembic 生成 migration：

```powershell
& "C:\Users\zzy\anaconda3\Scripts\conda.exe" run -n accounting-system alembic revision --autogenerate -m "message"
& "C:\Users\zzy\anaconda3\Scripts\conda.exe" run -n accounting-system alembic upgrade head
```

执行 Alembic 前必须确保 `.env` 中的 `DATABASE_URL` 已正确配置。

检查模型和数据库结构是否一致：

```powershell
& "C:\Users\zzy\anaconda3\Scripts\conda.exe" run -n accounting-system alembic check
```

## 开发用默认用户

当前阶段还没有登录和用户管理 API。为了本地测试账户、分类接口，可以创建一个开发用默认用户：

```powershell
& "C:\Users\zzy\anaconda3\Scripts\conda.exe" run -n accounting-system python scripts\create_dev_user.py
```

脚本可重复执行；如果 `username=dev` 已存在，不会重复创建。

## 当前 API

```text
GET /health

GET    /accounts
POST   /accounts
PATCH  /accounts/{account_id}
DELETE /accounts/{account_id}

GET    /categories
POST   /categories
PATCH  /categories/{category_id}
DELETE /categories/{category_id}

GET  /transactions
POST /transactions
GET  /transactions/{transaction_id}
GET  /transactions/export.csv

GET /reports/accounts
GET /reports/monthly
GET /reports/categories
```

交易创建支持 `income`、`expense`、`transfer`。CSV 导出是一条交易明细一行，转账会导出两行。
