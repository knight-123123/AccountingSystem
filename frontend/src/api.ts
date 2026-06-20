const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export type Account = {
  id: number;
  user_id: number;
  name: string;
  type: string;
  currency: string;
  initial_balance: string;
  is_active: boolean;
};

export type Category = {
  id: number;
  user_id: number;
  name: string;
  type: string;
  parent_id: number | null;
  sort_order: number;
  is_active: boolean;
};

export type TransactionEntry = {
  id: number;
  account_id: number;
  amount: string;
  currency: string;
};

export type Transaction = {
  id: number;
  user_id: number;
  kind: "income" | "expense" | "transfer";
  category_id: number | null;
  occurred_on: string;
  merchant: string | null;
  note: string | null;
  entries: TransactionEntry[];
};

export type AccountReport = {
  account_id: number;
  name: string;
  type: string;
  currency: string;
  initial_balance: string;
  entry_total: string;
  balance: string;
};

export type MonthlyReport = {
  month: string;
  income: string;
  expense: string;
  net: string;
};

export type CategoryReport = {
  category_id: number | null;
  category_name: string | null;
  kind: string;
  amount: string;
};

export type TransactionPayload = {
  user_id: number;
  kind: "income" | "expense" | "transfer";
  amount: string;
  currency: string;
  category_id?: number | null;
  occurred_on: string;
  merchant?: string;
  note?: string;
  account_id?: number;
  from_account_id?: number;
  to_account_id?: number;
};

export type AccountPayload = {
  user_id: number;
  name: string;
  type: string;
  currency: string;
  initial_balance: string;
  is_active: boolean;
};

export type AccountUpdatePayload = Partial<Omit<AccountPayload, "user_id">>;

export type CategoryPayload = {
  user_id: number;
  name: string;
  type: "income" | "expense";
  parent_id: number | null;
  sort_order: number;
  is_active: boolean;
};

export type CategoryUpdatePayload = Partial<Omit<CategoryPayload, "user_id">>;

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function requestNoContent(path: string, options?: RequestInit): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed: ${response.status}`);
  }
}

export const api = {
  health: () => requestJson<{ status: string }>("/health"),
  accounts: () => requestJson<Account[]>("/accounts"),
  createAccount: (payload: AccountPayload) =>
    requestJson<Account>("/accounts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAccount: (accountId: number, payload: AccountUpdatePayload) =>
    requestJson<Account>(`/accounts/${accountId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAccount: (accountId: number) =>
    requestNoContent(`/accounts/${accountId}`, {
      method: "DELETE",
    }),
  categories: () => requestJson<Category[]>("/categories"),
  createCategory: (payload: CategoryPayload) =>
    requestJson<Category>("/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCategory: (categoryId: number, payload: CategoryUpdatePayload) =>
    requestJson<Category>(`/categories/${categoryId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteCategory: (categoryId: number) =>
    requestNoContent(`/categories/${categoryId}`, {
      method: "DELETE",
    }),
  transactions: () => requestJson<Transaction[]>("/transactions"),
  createTransaction: (payload: TransactionPayload) =>
    requestJson<Transaction>("/transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  accountReports: () => requestJson<AccountReport[]>("/reports/accounts"),
  monthlyReports: () => requestJson<MonthlyReport[]>("/reports/monthly"),
  categoryReports: () => requestJson<CategoryReport[]>("/reports/categories"),
  csvUrl: () => `${API_BASE_URL}/transactions/export.csv`,
};
