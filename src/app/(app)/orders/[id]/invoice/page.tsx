"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { dateTimeText, money, numberText } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { SalesOrder, SalesOrderItem } from "@/lib/types";

export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [items, setItems] = useState<SalesOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvoice() {
      const [orderRes, itemRes] = await Promise.all([
        supabase.from("sales_orders").select("*").eq("id", params.id).single(),
        supabase.from("sales_order_items").select("*").eq("sales_order_id", params.id).order("id"),
      ]);

      if (orderRes.error) setError(orderRes.error.message);
      if (itemRes.error) setError(itemRes.error.message);

      setOrder((orderRes.data as SalesOrder) ?? null);
      setItems((itemRes.data as SalesOrderItem[]) ?? []);
      setLoading(false);
    }

    loadInvoice();
  }, [params.id]);

  if (loading) {
    return <div className="message">Đang tải hóa đơn...</div>;
  }

  if (error || !order) {
    return <div className="message error">{error || "Không tìm thấy hóa đơn."}</div>;
  }

  return (
    <div className="invoice-page">
      <div className="print-actions">
        <Link href="/sales" className="soft-btn">
          <ArrowLeft size={18} />
          Quay lại bán hàng
        </Link>
        <button className="primary-btn" onClick={() => window.print()}>
          <Printer size={18} />
          In / Lưu PDF
        </button>
      </div>

      <section className="invoice-sheet">
        <div className="invoice-head">
          <div>
            <Image src="/gd-logo.svg" alt="GD COMPUTER" width={230} height={70} priority />
            <p className="muted" style={{ marginTop: 12 }}>
              Cửa hàng linh kiện máy tính
              <br />
              Điện thoại: 0900 000 000
              <br />
              Địa chỉ: Cập nhật địa chỉ cửa hàng trong README
            </p>
          </div>
          <div className="invoice-title">
            <h1>HÓA ĐƠN BÁN HÀNG</h1>
            <p>
              <strong>Mã đơn:</strong> {order.code}
              <br />
              <strong>Ngày:</strong> {dateTimeText(order.order_date)}
            </p>
          </div>
        </div>

        <div className="invoice-info">
          <div className="panel">
            <h2>Khách hàng</h2>
            <p>
              <strong>{order.customer_name || "Khách lẻ"}</strong>
              <br />
              SĐT: {order.customer_phone || "-"}
              <br />
              Địa chỉ: {order.customer_address || "-"}
            </p>
          </div>
          <div className="panel">
            <h2>Ghi chú</h2>
            <p>{order.note || "Cảm ơn quý khách đã mua hàng tại GD COMPUTER."}</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Sản phẩm</th>
                <th>Mã</th>
                <th>Số lượng</th>
                <th>Đơn giá</th>
                <th>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.product_name}</td>
                  <td>{item.product_sku}</td>
                  <td>{numberText(item.quantity)}</td>
                  <td>{money(item.unit_price)}</td>
                  <td>{money(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="total-box" style={{ maxWidth: 360, marginLeft: "auto" }}>
          <div className="total-line">
            <span>Tạm tính</span>
            <strong>{money(order.subtotal)}</strong>
          </div>
          <div className="total-line">
            <span>Tổng thanh toán</span>
            <strong>{money(order.total_amount)}</strong>
          </div>
        </div>

        <div className="invoice-info" style={{ marginTop: 42 }}>
          <div style={{ textAlign: "center" }}>
            <strong>Người bán</strong>
            <p className="muted">Ký và ghi rõ họ tên</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <strong>Khách hàng</strong>
            <p className="muted">Ký và ghi rõ họ tên</p>
          </div>
        </div>
      </section>
    </div>
  );
}
