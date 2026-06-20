import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  Account,
  AccountReport,
  api,
  Category,
  CategoryReport,
  MonthlyReport,
  Transaction,
  TransactionFilters,
  TransactionPayload,
} from "./api";

const USER_ID = 1;

type FormState = {
  kind: "income" | "expense" | "transfer";
  amount: string;
  occurred_on: string;
  account_id: string;
  from_account_id: string;
  to_account_id: string;
  category_id: string;
  merchant: string;
  note: string;
};

const today = new Date().toISOString().slice(0, 10);

const initialForm: FormState = {
  kind: "expense",
  amount: "",
  occurred_on: today,
  account_id: "",
  from_account_id: "",
  to_account_id: "",
  category_id: "",
  merchant: "",
  note: "",
};

type AccountFormState = {
  name: string;
  type: string;
  currency: string;
  initial_balance: string;
};

const initialAccountForm: AccountFormState = {
  name: "",
  type: "cash",
  currency: "CNY",
  initial_balance: "0.00",
};

type CategoryFormState = {
  name: string;
  type: "income" | "expense";
  sort_order: string;
};

const initialCategoryForm: CategoryFormState = {
  name: "",
  type: "expense",
  sort_order: "0",
};

type FilterState = {
  start_date: string;
  end_date: string;
  kind: string;
  account_id: string;
  category_id: string;
};

const initialFilters: FilterState = {
  start_date: "",
  end_date: "",
  kind: "",
  account_id: "",
  category_id: "",
};

function formatMoney(value: string) {
  return Number(value).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function App() {
  const [status, setStatus] = useState("checking");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accountReports, setAccountReports] = useState<AccountReport[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [categoryReports, setCategoryReports] = useState<CategoryReport[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [accountForm, setAccountForm] = useState<AccountFormState>(initialAccountForm);
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(initialCategoryForm);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const accountName = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );
  const categoryName = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  async function loadData(nextFilters: TransactionFilters = filters) {
    const [
      health,
      nextAccounts,
      nextCategories,
      nextTransactions,
      nextAccountReports,
      nextMonthlyReports,
      nextCategoryReports,
    ] = await Promise.all([
      api.health(),
      api.accounts(),
      api.categories(),
      api.transactions(nextFilters),
      api.accountReports(),
      api.monthlyReports(),
      api.categoryReports(),
    ]);

    setStatus(health.status);
    setAccounts(nextAccounts.filter((account) => account.is_active));
    setCategories(nextCategories.filter((category) => category.is_active));
    setTransactions(nextTransactions);
    setAccountReports(nextAccountReports);
    setMonthlyReports(nextMonthlyReports);
    setCategoryReports(nextCategoryReports);
  }

  useEffect(() => {
    loadData().catch((error: unknown) => {
      setStatus("offline");
      setMessage(error instanceof Error ? error.message : "加载失败");
    });
  }, []);

  function updateForm(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateAccountForm(field: keyof AccountFormState, value: string) {
    setAccountForm((current) => ({ ...current, [field]: value }));
  }

  function updateCategoryForm(field: keyof CategoryFormState, value: string) {
    setCategoryForm((current) => ({ ...current, [field]: value }));
  }

  function updateFilters(field: keyof FilterState, value: string) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  async function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await loadData(filters);
      setMessage("交易筛选已应用");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "交易筛选失败");
    } finally {
      setLoading(false);
    }
  }

  async function clearFilters() {
    setLoading(true);
    setMessage("");
    try {
      setFilters(initialFilters);
      await loadData(initialFilters);
      setMessage("交易筛选已清除");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "交易筛选失败");
    } finally {
      setLoading(false);
    }
  }

  async function submitTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const categoryId = form.category_id ? Number(form.category_id) : null;
      const payload: TransactionPayload = {
        user_id: USER_ID,
        kind: form.kind,
        amount: form.amount,
        currency: "CNY",
        category_id: form.kind === "transfer" ? null : categoryId,
        occurred_on: form.occurred_on,
        merchant: form.merchant || undefined,
        note: form.note || undefined,
        ...(form.kind === "transfer"
          ? {
              from_account_id: Number(form.from_account_id),
              to_account_id: Number(form.to_account_id),
            }
          : { account_id: Number(form.account_id) }),
      };

      if (editingTransactionId === null) {
        await api.createTransaction(payload);
        setMessage("交易已保存");
      } else {
        await api.updateTransaction(editingTransactionId, payload);
        setMessage("交易已更新");
      }

      setForm({ ...initialForm, occurred_on: form.occurred_on, kind: form.kind });
      setEditingTransactionId(null);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (editingAccountId === null) {
        await api.createAccount({
          user_id: USER_ID,
          name: accountForm.name,
          type: accountForm.type,
          currency: accountForm.currency,
          initial_balance: accountForm.initial_balance,
          is_active: true,
        });
        setMessage("账户已创建");
      } else {
        await api.updateAccount(editingAccountId, {
          name: accountForm.name,
          type: accountForm.type,
          currency: accountForm.currency,
          initial_balance: accountForm.initial_balance,
        });
        setMessage("账户已更新");
      }

      setAccountForm(initialAccountForm);
      setEditingAccountId(null);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "账户保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const sortOrder = Number(categoryForm.sort_order || "0");
      if (editingCategoryId === null) {
        await api.createCategory({
          user_id: USER_ID,
          name: categoryForm.name,
          type: categoryForm.type,
          parent_id: null,
          sort_order: sortOrder,
          is_active: true,
        });
        setMessage("分类已创建");
      } else {
        await api.updateCategory(editingCategoryId, {
          name: categoryForm.name,
          type: categoryForm.type,
          sort_order: sortOrder,
        });
        setMessage("分类已更新");
      }

      setCategoryForm(initialCategoryForm);
      setEditingCategoryId(null);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "分类保存失败");
    } finally {
      setLoading(false);
    }
  }

  function editAccount(account: Account) {
    setEditingAccountId(account.id);
    setAccountForm({
      name: account.name,
      type: account.type,
      currency: account.currency,
      initial_balance: account.initial_balance,
    });
  }

  function editCategory(category: Category) {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name,
      type: category.type === "income" ? "income" : "expense",
      sort_order: String(category.sort_order),
    });
  }

  async function disableAccount(accountId: number) {
    setLoading(true);
    setMessage("");
    try {
      await api.deleteAccount(accountId);
      await loadData();
      setMessage("账户已停用");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "账户停用失败");
    } finally {
      setLoading(false);
    }
  }

  async function disableCategory(categoryId: number) {
    setLoading(true);
    setMessage("");
    try {
      await api.deleteCategory(categoryId);
      await loadData();
      setMessage("分类已停用");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "分类停用失败");
    } finally {
      setLoading(false);
    }
  }

  async function deleteTransaction(transactionId: number) {
    if (!window.confirm("确定删除这笔交易吗？")) {
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await api.deleteTransaction(transactionId);
      await loadData();
      setMessage("交易已删除");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "交易删除失败");
    } finally {
      setLoading(false);
    }
  }

  function editTransaction(transaction: Transaction) {
    const entries = [...transaction.entries].sort((left, right) =>
      Number(left.amount) - Number(right.amount),
    );
    const firstEntry = entries[0];
    const secondEntry = entries[1];
    const amount = Math.abs(Number(firstEntry?.amount ?? "0")).toFixed(2);

    setEditingTransactionId(transaction.id);
    setForm({
      kind: transaction.kind,
      amount,
      occurred_on: transaction.occurred_on,
      account_id: transaction.kind === "transfer" ? "" : String(firstEntry?.account_id ?? ""),
      from_account_id:
        transaction.kind === "transfer" ? String(firstEntry?.account_id ?? "") : "",
      to_account_id:
        transaction.kind === "transfer" ? String(secondEntry?.account_id ?? "") : "",
      category_id: transaction.category_id ? String(transaction.category_id) : "",
      merchant: transaction.merchant ?? "",
      note: transaction.note ?? "",
    });
    setMessage("正在编辑交易");
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <h1>个人记账</h1>
          <p>后端状态：{status}</p>
        </div>
        <a className="button secondary" href={api.csvUrl()}>
          CSV 导出
        </a>
      </section>

      {message ? <div className="notice">{message}</div> : null}

      <section className="grid two-columns">
        <form className="panel" onSubmit={submitTransaction}>
          <div className="panel-header">
            <h2>{editingTransactionId === null ? "新增交易" : "编辑交易"}</h2>
            {editingTransactionId !== null ? (
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setEditingTransactionId(null);
                  setForm(initialForm);
                }}
              >
                取消编辑
              </button>
            ) : null}
          </div>

          <div className="segmented">
            {(["expense", "income", "transfer"] as const).map((kind) => (
              <button
                key={kind}
                className={form.kind === kind ? "active" : ""}
                type="button"
                onClick={() => updateForm("kind", kind)}
              >
                {kind === "expense" ? "支出" : kind === "income" ? "收入" : "转账"}
              </button>
            ))}
          </div>

          <label>
            金额
            <input
              min="0.01"
              required
              step="0.01"
              type="number"
              value={form.amount}
              onChange={(event) => updateForm("amount", event.target.value)}
            />
          </label>

          <label>
            日期
            <input
              required
              type="date"
              value={form.occurred_on}
              onChange={(event) => updateForm("occurred_on", event.target.value)}
            />
          </label>

          {form.kind === "transfer" ? (
            <div className="inline-fields">
              <label>
                转出账户
                <select
                  required
                  value={form.from_account_id}
                  onChange={(event) => updateForm("from_account_id", event.target.value)}
                >
                  <option value="">选择账户</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                转入账户
                <select
                  required
                  value={form.to_account_id}
                  onChange={(event) => updateForm("to_account_id", event.target.value)}
                >
                  <option value="">选择账户</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <>
              <label>
                账户
                <select
                  required
                  value={form.account_id}
                  onChange={(event) => updateForm("account_id", event.target.value)}
                >
                  <option value="">选择账户</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                分类
                <select
                  value={form.category_id}
                  onChange={(event) => updateForm("category_id", event.target.value)}
                >
                  <option value="">无分类</option>
                  {categories
                    .filter((category) => category.type === form.kind)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </label>
            </>
          )}

          <label>
            商户
            <input
              value={form.merchant}
              onChange={(event) => updateForm("merchant", event.target.value)}
            />
          </label>

          <label>
            备注
            <input value={form.note} onChange={(event) => updateForm("note", event.target.value)} />
          </label>

          <button className="button primary" disabled={loading} type="submit">
            {loading ? "保存中" : editingTransactionId === null ? "保存交易" : "更新交易"}
          </button>
        </form>

        <section className="panel">
          <div className="panel-header">
            <h2>账户余额</h2>
          </div>
          <div className="stack">
            {accountReports.map((report) => (
              <div className="balance-row" key={report.account_id}>
                <div>
                  <strong>{report.name}</strong>
                  <span>{report.type}</span>
                </div>
                <b>{formatMoney(report.balance)}</b>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="grid two-columns">
        <section className="panel">
          <div className="panel-header">
            <h2>账户管理</h2>
            {editingAccountId !== null ? (
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setEditingAccountId(null);
                  setAccountForm(initialAccountForm);
                }}
              >
                取消编辑
              </button>
            ) : null}
          </div>

          <form className="compact-form" onSubmit={submitAccount}>
            <div className="inline-fields">
              <label>
                名称
                <input
                  required
                  value={accountForm.name}
                  onChange={(event) => updateAccountForm("name", event.target.value)}
                />
              </label>
              <label>
                类型
                <select
                  value={accountForm.type}
                  onChange={(event) => updateAccountForm("type", event.target.value)}
                >
                  <option value="cash">现金</option>
                  <option value="bank">银行卡</option>
                  <option value="wechat">微信</option>
                  <option value="alipay">支付宝</option>
                  <option value="credit_card">信用卡</option>
                  <option value="other">其他</option>
                </select>
              </label>
            </div>
            <div className="inline-fields">
              <label>
                币种
                <input
                  maxLength={3}
                  required
                  value={accountForm.currency}
                  onChange={(event) =>
                    updateAccountForm("currency", event.target.value.toUpperCase())
                  }
                />
              </label>
              <label>
                初始余额
                <input
                  required
                  step="0.01"
                  type="number"
                  value={accountForm.initial_balance}
                  onChange={(event) => updateAccountForm("initial_balance", event.target.value)}
                />
              </label>
            </div>
            <button className="button primary" disabled={loading} type="submit">
              {editingAccountId === null ? "新增账户" : "保存账户"}
            </button>
          </form>

          <div className="manage-list">
            {accounts.map((account) => (
              <div className="manage-row" key={account.id}>
                <div>
                  <strong>{account.name}</strong>
                  <span>
                    {account.type} / {account.currency} / 初始 {formatMoney(account.initial_balance)}
                  </span>
                </div>
                <div className="row-actions">
                  <button type="button" onClick={() => editAccount(account)}>
                    编辑
                  </button>
                  <button type="button" onClick={() => disableAccount(account.id)}>
                    停用
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>分类管理</h2>
            {editingCategoryId !== null ? (
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setEditingCategoryId(null);
                  setCategoryForm(initialCategoryForm);
                }}
              >
                取消编辑
              </button>
            ) : null}
          </div>

          <form className="compact-form" onSubmit={submitCategory}>
            <label>
              名称
              <input
                required
                value={categoryForm.name}
                onChange={(event) => updateCategoryForm("name", event.target.value)}
              />
            </label>
            <div className="inline-fields">
              <label>
                类型
                <select
                  value={categoryForm.type}
                  onChange={(event) =>
                    updateCategoryForm(
                      "type",
                      event.target.value === "income" ? "income" : "expense",
                    )
                  }
                >
                  <option value="expense">支出</option>
                  <option value="income">收入</option>
                </select>
              </label>
              <label>
                排序
                <input
                  required
                  type="number"
                  value={categoryForm.sort_order}
                  onChange={(event) => updateCategoryForm("sort_order", event.target.value)}
                />
              </label>
            </div>
            <button className="button primary" disabled={loading} type="submit">
              {editingCategoryId === null ? "新增分类" : "保存分类"}
            </button>
          </form>

          <div className="manage-list">
            {categories.map((category) => (
              <div className="manage-row" key={category.id}>
                <div>
                  <strong>{category.name}</strong>
                  <span>
                    {category.type === "income" ? "收入" : "支出"} / 排序 {category.sort_order}
                  </span>
                </div>
                <div className="row-actions">
                  <button type="button" onClick={() => editCategory(category)}>
                    编辑
                  </button>
                  <button type="button" onClick={() => disableCategory(category.id)}>
                    停用
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="grid two-columns">
        <section className="panel">
          <div className="panel-header">
            <h2>交易流水</h2>
          </div>
          <form className="filter-bar" onSubmit={applyFilters}>
            <label>
              开始日期
              <input
                type="date"
                value={filters.start_date}
                onChange={(event) => updateFilters("start_date", event.target.value)}
              />
            </label>
            <label>
              结束日期
              <input
                type="date"
                value={filters.end_date}
                onChange={(event) => updateFilters("end_date", event.target.value)}
              />
            </label>
            <label>
              类型
              <select value={filters.kind} onChange={(event) => updateFilters("kind", event.target.value)}>
                <option value="">全部</option>
                <option value="expense">支出</option>
                <option value="income">收入</option>
                <option value="transfer">转账</option>
              </select>
            </label>
            <label>
              账户
              <select
                value={filters.account_id}
                onChange={(event) => updateFilters("account_id", event.target.value)}
              >
                <option value="">全部</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              分类
              <select
                value={filters.category_id}
                onChange={(event) => updateFilters("category_id", event.target.value)}
              >
                <option value="">全部</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="filter-actions">
              <button className="button secondary" disabled={loading} type="submit">
                筛选
              </button>
              <button className="button secondary" disabled={loading} type="button" onClick={clearFilters}>
                清除
              </button>
            </div>
          </form>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>日期</th>
                  <th>类型</th>
                  <th>账户</th>
                  <th>分类</th>
                  <th>金额</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) =>
                  transaction.entries.map((entry) => (
                    <tr key={`${transaction.id}-${entry.id}`}>
                      <td>{transaction.occurred_on}</td>
                      <td>{transaction.kind}</td>
                      <td>{accountName.get(entry.account_id) ?? entry.account_id}</td>
                      <td>
                        {transaction.category_id
                          ? categoryName.get(transaction.category_id) ?? transaction.category_id
                          : "-"}
                      </td>
                      <td className={Number(entry.amount) < 0 ? "negative" : "positive"}>
                        {formatMoney(entry.amount)}
                      </td>
                      <td>
                        <button
                          className="link-action"
                          disabled={loading}
                          type="button"
                          onClick={() => editTransaction(transaction)}
                        >
                          编辑
                        </button>
                        <button
                          className="link-action danger"
                          disabled={loading}
                          type="button"
                          onClick={() => deleteTransaction(transaction.id)}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>统计</h2>
          </div>
          <div className="summary-grid">
            {monthlyReports.map((report) => (
              <div className="summary" key={report.month}>
                <span>{report.month}</span>
                <strong>{formatMoney(report.net)}</strong>
                <small>收入 {formatMoney(report.income)} / 支出 {formatMoney(report.expense)}</small>
              </div>
            ))}
          </div>
          <div className="category-list">
            {categoryReports.map((report) => (
              <div className="category-row" key={`${report.kind}-${report.category_id}`}>
                <span>{report.category_name ?? "未分类"}</span>
                <span>{report.kind}</span>
                <b>{formatMoney(report.amount)}</b>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
