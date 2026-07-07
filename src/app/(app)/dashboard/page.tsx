"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Banknote, PackageSearch, ReceiptText, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { dateTimeText, money, numberText, todayInputValue } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { LowStock, SalesOrder } from "@/lib/types";

type RevenueRow = {
  revenue_date?: string;
  revenue_month?: string;
  order_count: number;
  revenue: number;
  profit: number;
};

export default function DashboardPage() {
  const [today, setToday] = useState<RevenueRow | null>(null);
  const [month, setMonth] = useState<RevenueRow | null>(null);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [lowStock, setLowStock] = useState<LowStock[]>([]);
  const [loading, setLoading] = useState(true);

  const monthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }, []);

  useEffect(() => {
    async function load() {
      const todayKey = todayInputValue();

      const [todayRes, monthRes, orderRes, stockRes] = await Promise.all([
        supabase.from("v_daily_revenue").select("*").eq("revenue_date", todayKey).maybeSingle(),
        supabase.from("v_monthly_revenue").select("*").eq("revenue_month", monthKey).maybeSingle(),
        supabase.from("sales_orders").select("*").order("order_date", { ascending: false }).limit(8),
        supabase.from("v_low_stock").select("*").limit(8),
      ]);

      setToday((todayRes.data as RevenueRow | null) ?? null);
      setMonth((monthRes.data as RevenueRow | null) ?? null);
      setOrders((orderRes.data as SalesOrder[]) ?? []);
      setLowStock((stockRes.data as LowStock[]) ?? []);
      setLoading(false);
    }

    load();
  }, [monthKey]);

  return (
    <>
      <PageHeader
        title="Tổng quan"
        description="Theo dõi doanh thu, lợi nhuận, đơn hàng mới và sản phẩm sắp hết hàng."
      >
        <Link href="/sales" className="primary-btn">
          <ReceiptText size={18} />
          Tạo đơn bán
        </Link>
      </PageHeader>

      <section className="grid-4">
        <StatCard
          label="Doanh thu hôm nay"
          value={money(today?.revenue)}
          tone="red"
          icon={<Banknote size={21} />}
        />
        <StatCard
          label="Lợi nhuận hôm nay"
          value={money(today?.profit)}
          tone="green"
          icon={<TrendingUp size={21} />}
        />
        <StatCard
          label="Doanh thu tháng này"
          value={money(month?.revenue)}
          tone="gray"
          icon={<Banknote size={21} />}
        />
        <StatCard
          label="Đơn hàng tháng này"
          value={numberText(month?.order_count)}
          tone="amber"
          icon={<ReceiptText size={21} />}
        />
      </section>

      <section className="grid-2" style={{ marginTop: 14 }}>
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Đơn hàng mới</h2>
              <p>Các đơn bán gần nhất trong cửa hàng.</p>
            </div>
            <Link href="/orders" className="soft-btn compact">
              Xem đơn hàng
            </Link>
          </div>

          {loading ? (
            <div className="message">Đang tải dữ liệu...</div>
          ) : orders.length === 0 ? (
            <EmptyState title="Chưa có đơn hàng" description="Tạo đơn bán đầu tiên để bắt đầu ghi nhận doanh thu." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách hàng</th>
                    <th>Thời gian</th>
                    <th>Doanh thu</th>
                    <th>Lợi nhuận</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link href={`/orders/${order.id}/invoice`} className="muted">
                          {order.code}
                        </Link>
                      </td>
                      <td>{order.customer_name || "Khách lẻ"}</td>
                      <td>{dateTimeText(order.order_date)}</td>
                      <td>{money(order.total_amount)}</td>
                      <td>{money(order.total_profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Tồn kho thấp</h2>
              <p>Sản phẩm cần nhập thêm để tránh hết hàng khi bán.</p>
            </div>
            <AlertTriangle size={22} color="#b7791f" />
          </div>

          {loading ? (
            <div className="message">Đang tải dữ liệu...</div>
          ) : lowStock.length === 0 ? (
            <EmptyState title="Kho đang ổn" description="Chưa có sản phẩm nào chạm ngưỡng tồn kho thấp." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Danh mục</th>
                    <th>Tồn</th>
                    <th>Ngưỡng</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="product-cell">
                          <div className="product-thumb">
                            <PackageSearch size={18} />
                          </div>
                          <div className="product-meta">
                            <strong>{item.name}</strong>
                            <span>{item.sku}</span>
                          </div>
                        </div>
                      </td>
                      <td>{item.category_name || "-"}</td>
                      <td>
                        <span className="badge warn">{numberText(item.stock_quantity)}</span>
                      </td>
                      <td>{numberText(item.low_stock_threshold)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
