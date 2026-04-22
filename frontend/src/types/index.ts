export interface User {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type Category = 'TRAVEL' | 'MEALS' | 'OFFICE_SUPPLIES' | 'SOFTWARE' | 'HARDWARE' | 'MARKETING' | 'OTHER';

export interface ExpenseReport {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: ReportStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: ExpenseItem[];
}

export interface ExpenseItem {
  id: string;
  reportId: string;
  amount: number;
  currency: string;
  category: Category;
  merchantName: string;
  transactionDate: string;
  receiptUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportRequest {
  title: string;
  description?: string;
}

export interface UpdateReportRequest {
  title?: string;
  description?: string | null;
}

export interface CreateItemRequest {
  amount: number;
  currency?: string;
  category: Category;
  merchantName: string;
  transactionDate: string;
}

export interface UpdateItemRequest extends Partial<CreateItemRequest> {}

export interface ExtractedField<T> {
  value: T;
  confidence: number;
}

export interface ExtractedData {
  merchantName?: ExtractedField<string>;
  amount?: ExtractedField<number>;
  currency?: ExtractedField<string>;
  category?: ExtractedField<string>;
  transactionDate?: ExtractedField<string>;
}

export interface UploadReceiptResponse {
  receiptUrl: string;
  itemId: string;
}

export interface ExtractionResponse {
  extracted: ExtractedData;
  receiptUrl: string;
}

export interface ApplyExtractionRequest {
  merchantName?: string;
  amount?: number;
  currency?: string;
  category?: Category;
  transactionDate?: string;
}

export interface AdminExpenseReport extends ExpenseReport {
  user: { id: string; email: string };
}
