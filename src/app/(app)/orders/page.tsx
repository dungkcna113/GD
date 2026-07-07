"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, ListFilter, Plus, ReceiptText } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { dateTimeText, money, numberText } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { SalesOrder } from "@/lib/types";

const tabs = [
  { key: "all", label: "Tất cả" },
  { key: "ordered", label: "Đặt hàng" },
  { key: "completed", label: "Đã hoàn thành" },
  { key: "cancelled", label: "Đã hủy" },
];

const paymentLabels: Record<SalesOrder["payment_status"], string> = {
  unpaid: "Chưa thanh toán",
  paid: "Đã thanh toán",
  refunded: "Đã hoàn tiền",
};

const processingLabels: Record<SalesOrder["processing_status"], string> = {
  ordered: "Đã đặt hàng",
  completed: "Đã xử lý",
  cancelled: "Đã hủy",
};

function paymentClass(status: SalesOrder["payment_status"]) {
  if (status === "paid") return "badge ok";
  if (status === "refunded") return "badge danger";
  return "badge warn";
}

function processingClass(status: SalesOrder["processing_status"]) {
  if (status === "completed") return "badge ok";
  if (status === "cancelled") return "badge danger";
  return "badge info";
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesTab = activeTab === "all" || order.processing_status === activeTab;
      const matchesPayment = paymentFilter === "all" || order.payment_status === paymentFilter;
      const matchesSearch =
        !keyword ||
        [order.code, order.customer_name, order.customer_phone, order.source]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      return matchesTab && matchesPayment && matchesSearch;
    });
  }, [orders, activeTab, search, paymentFilter]);

  async function loadOrders() {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("sales_orders")
      .select("*")
      .order("order_date", { ascending: false });

    if (loadError) setError(loadError.message);
    setOrders((data as SalesOrder[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function updateOrder(
    order: SalesOrder,
    patch: Partial<Pick<SalesOrder, "payment_status" | "processing_status">>,
  ) {
    const previous = orders;
    setOrders((current) => current.map((item) => (item.id === order.id ? { ...item, ...patch } : item)));
    const { error: updateError } = await supabase.from("sales_orders").update(patch).eq("id", order.id);
    if (updateError) {
      setOrders(previous);
      setError(updateError.message);
    }
  }

  return (
    <>
      <PageHeader title="Danh sách đơn hàng" description="Theo dõi đơn bán, trạng thái thanh toán và xử lý.">
        <button className="soft-btn" type="button">
          <Download size={17} />
          Xuất file
        </button>
        <Link href="/sales" className="primary-btn">
          <Plus size={17} />
          Tạo đơn hàng
        </Link>
      </PageHeader>

      {error && <div className="message error">{error}</div>}

      <section className="table-panel">
        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="filter-row">
          <input
            className="search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm kiếm theo mã đơn hàng, SĐT khách hàng"
          />
          <div className="filters">
            <select className="filter-control" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
              <option value="all">Tất cả thanh toán</option>
              <option value="unpaid">Chưa thanh toán</option>
              <option value="paid">Đã thanh toán</option>
              <option value="refunded">Đã hoàn tiền</option>
            </select>
            <button className="soft-btn compact" type="button">
              <ListFilter size={16} />
              Bộ lọc khác
            </button>
          </div>
        </div>

        {loading ? (
          <div className="message" style={{ margin: 20 }}>
            Đang tải đơn hàng...
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState title="Chưa có đơn hàng" description="Tạo đơn bán đầu tiên để bắt đầu ghi nhận doanh thu." />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mã đơn hàng</th>
                    <th>Ngày đặt hàng</th>
                    <th>Khách hàng</th>
                    <th>Nguồn đơn</th>
                    <th>Thành tiền</th>
                    <th>Trạng thái thanh toán</th>
                    <th>Trạng thái xử lý</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link className="link-blue" href={`/orders/${order.id}/invoice`}>
                          {order.code}
                        </Link>
                      </td>
                      <td>{dateTimeText(order.order_date)}</td>
                      <td>{order.customer_name || "Khách lẻ"}</td>
                      <td>{order.source || "Cửa hàng"}</td>
                      <td>{money(order.total_amount)}</td>
                      <td>
                        <select
                          value={order.payment_status}
                          onChange={(event) =>
                            updateOrder(order, { payment_status: event.target.value as SalesOrder["payment_status"] })
                          }
                        >
                          <option value="unpaid">Chưa thanh toán</option>
                          <option value="paid">Đã thanh toán</option>
                          <option value="refunded">Đã hoàn tiền</option>
                        </select>
                        <span className={paymentClass(order.payment_status)} style={{ marginTop: 6 }}>
                          {paymentLabels[order.payment_status]}
                        </span>
                      </td>
                      <td>
                        <select
                          value={order.processing_status}
                          onChange={(event) =>
                            updateOrder(order, {
                              processing_status: event.target.value as SalesOrder["processing_status"],
                            })
                          }
                        >
                          <option value="ordered">Đã đặt hàng</option>
                          <option value="completed">Đã xử lý</option>
                          <option value="cancelled">Đã hủy</option>
                        </select>
                        <span className={processingClass(order.processing_status)} style={{ marginTop: 6 }}>
                          {processingLabels[order.processing_status]}
                        </span>
                      </td>
                      <td>
                        <Link href={`/orders/${order.id}/invoice`} className="soft-btn compact">
                          <ReceiptText size={16} />
                          Hóa đơn
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="filter-row">
              <span>
                Từ 1 đến {numberText(filteredOrders.length)} trên tổng {numberText(orders.length)}
              </span>
              <span className="badge info">Hiển thị 20</span>
            </div>
          </>
        )}
      </section>
    </>
  );
}
