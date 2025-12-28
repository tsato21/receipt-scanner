export interface User {
  email: string; // ID
  displayName: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Store {
  id: string;
  name: string;
  defaultCategoryId: string;
  lastUsedAt: Date;
}

export interface ReceiptItem {
  name: string;
  price: number;
}

export interface Receipt {
  id?: string;
  userId: string;
  date: Date;
  storeId: string;
  storeName: string; // Snapshot
  categoryId: string;
  total: number;
  items: ReceiptItem[];
  createdAt: Date;
}

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: '食費', color: '#FF6384' },     // Red/Pink
  { name: '日用品', color: '#36A2EB' },   // Blue
  { name: '交通費', color: '#FFCE56' },   // Yellow
  { name: '交際費', color: '#4BC0C0' },   // Teal
  { name: 'その他', color: '#9966FF' },   // Purple
];

export interface Reminder {
  id?: string;
  userId: string;
  lineUserId: string;
  itemName: string;
  frequencyDays: number;
  nextRunAt: Date;
  lastRunAt?: Date;
  enabled: boolean;
  createdAt: Date;
}

export interface NotificationLog {
  id?: string;
  userId: string;
  runAt: Date;
  status: 'success' | 'failed';
  targetItems: string[];
  message?: string;
}

export interface StatementFormat {
  id?: string;
  userId: string;
  name: string;
  headerSignature: string; // Comma separated header string
  columnMapping: {
    dateColumn: string;
    amountColumn: string;
    descColumn: string;
  };
}

export interface StatementItem {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  status: 'matched' | 'unmatched';
  matchedReceiptId?: string;
}

export interface Statement {
  id?: string;
  userId: string;
  formatId: string;
  title: string;
  rangeStart: Date;
  rangeEnd: Date;
  summary: {
    totalAmount: number;
    matchedAmount: number;
    unmatchedAmount: number;
  };
  items: StatementItem[];
  createdAt: Date;
}
