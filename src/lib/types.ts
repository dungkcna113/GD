export type Role = "owner" | "staff";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  role: Role;
  is_active: boolean;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
};

export type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  unit: string;
  description: string | null;
  category_id: string | null;
  category_name?: string | null;
  cost_price: number;
  sale_price: number;
  image_url: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
};

export type Customer = {
  id: string;
  code: string | null;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
};

export type Supplier = {
  id: string;
  code: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  note: string | null;
};

export type SalesOrder = {
  id: string;
  code: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  source: string;
  payment_status: "unpaid" | "paid" | "refunded";
  processing_status: "ordered" | "completed" | "cancelled";
  order_date: string;
  subtotal: number;
  total_amount: number;
  total_cost: number;
  total_profit: number;
  note: string | null;
};

export type CashEntry = {
  id: string;
  code: string;
  entry_type: "receipt" | "payment";
  cash_account: "cash" | "bank";
  entry_date: string;
  partner_name: string | null;
  reason: string;
  amount: number;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  created_at: string;
};

export type SalesOrderItem = {
  id: string;
  sales_order_id: string;
  product_id: string | null;
  product_sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  line_total: number;
  cost_total: number;
  profit: number;
};

export type PurchaseOrder = {
  id: string;
  code: string | null;
  supplier_id: string | null;
  purchase_date: string;
  total_amount: number;
  note: string | null;
};

export type RepairStatus = "received" | "checking" | "waiting_parts" | "repairing" | "done" | "returned" | "cancelled";

export type RepairOrder = {
  id: string;
  code: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  device_name: string;
  serial_number: string | null;
  issue_description: string;
  diagnosis: string | null;
  solution: string | null;
  status: RepairStatus;
  received_at: string;
  promised_date: string | null;
  completed_at: string | null;
  labor_fee: number;
  parts_total: number;
  total_amount: number;
  total_cost: number;
  total_profit: number;
  note: string | null;
};

export type RepairOrderItem = {
  id: string;
  repair_order_id: string;
  product_id: string | null;
  product_sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  line_total: number;
  cost_total: number;
  profit: number;
};

export type ReportRow = {
  revenue_date?: string;
  revenue_month?: string;
  order_count: number;
  revenue: number;
  cost: number;
  profit: number;
};

export type BestSeller = {
  product_id: string | null;
  product_sku: string;
  product_name: string;
  sold_quantity: number;
  revenue: number;
  profit: number;
};

export type LowStock = {
  id: string;
  sku: string;
  name: string;
  category_name: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
};
