"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Printer, ReceiptText, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { dateTimeText, money, numberText } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { Customer, Product, SalesOrder } from "@/lib/types";

type SaleItem = {
  product_id: string;
  quantity: string;
  unit_price: string;
};

const emptyItem: SaleItem = {
  product_id: "",
  quantity: "1",
  unit_price: "0",
};

export default function SalesPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<SaleItem[]>([{ ...emptyItem }]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0),
    [items],
  );

  const stockWarning = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const item of items) {
      if (!item.product_id) continue;
      grouped.set(item.product_id, (grouped.get(item.product_id) ?? 0) + Number(item.quantity || 0));
    }

    for (const [productId, quantity] of grouped.entries()) {
      const product = productMap.get(productId);
      if (product && quantity > product.stock_quantity) {
        return `${product.name} chỉ còn ${product.stock_quantity}, không thể bán ${quantity}.`;
      }
    }

    return null;
  }, [items, productMap]);

  async function loadData() {
    setLoading(true);
    const [customerRes, productRes, orderRes] = await Promise.all([
      supabase.from("customers").select("*").order("name"),
      supabase.from("products").select("*").eq("is_active", true).order("name"),
      supabase.from("sales_orders").select("*").order("order_date", { ascending: false }).limit(12),
    ]);

    if (customerRes.error) setError(customerRes.error.message);
    if (productRes.error) setError(productRes.error.message);
    if (orderRes.error) setError(orderRes.error.message);

    setCustomers((customerRes.data as Customer[]) ?? []);
    setProducts((productRes.data as Product[]) ?? []);
    setOrders((orderRes.data as SalesOrder[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function chooseCustomer(id: string) {
    setCustomerId(id);
    const customer = customers.find((entry) => entry.id === id);
    if (!customer) {
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      return;
    }
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone ?? "");
    setCustomerAddress(customer.address ?? "");
  }

  function updateItem(index: number, patch: Partial<SaleItem>) {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = { ...item, ...patch };
        if (patch.product_id) {
          const product = products.find((entry) => entry.id === patch.product_id);
          if (product) next.unit_price = String(product.sale_price ?? 0);
        }
        return next;
      }),
    );
  }

  function removeItem(index: number) {
    setItems((current) => (current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    if (stockWarning) {
      setError(stockWarning);
      setSaving(false);
      return;
    }

    const payloadItems = items.map((item) => ({
      product_id: item.product_id,
      quantity: Number(item.quantity || 0),
      unit_price: Number(item.unit_price || 0),
    }));

    if (payloadItems.some((item) => !item.product_id || item.quantity <= 0 || item.unit_price < 0)) {
      setError("Vui lòng chọn sản phẩm, nhập số lượng lớn hơn 0 và giá bán hợp lệ.");
      setSaving(false);
      return;
    }

    const { data, error: rpcError } = await supabase.rpc("create_sale_order", {
      p_customer_id: customerId || null,
      p_customer_name: customerName.trim() || null,
      p_customer_phone: customerPhone.trim() || null,
      p_customer_address: customerAddress.trim() || null,
      p_note: note.trim() || null,
      p_items: payloadItems,
    });

    if (rpcError) {
      setError(rpcError.message);
      setSaving(false);
      return;
    }

    setMessage("Đã tạo đơn hàng.");
    router.push(`/orders/${data as string}/invoice`);
  }

  return (
    <>
      <PageHeader
        title="Bán hàng"
        description="Tạo đơn, chọn khách hàng, thêm nhiều sản phẩm và tự tính tổng tiền."
      />

      <section className="split-layout">
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-head">
            <div>
              <h2>Đơn hàng mới</h2>
              <p>App không cho bán vượt số lượng tồn kho.</p>
            </div>
            <ReceiptText size={24} color="#ef233c" />
          </div>

          {message && <div className="message success">{message}</div>}
          {error && <div className="message error">{error}</div>}
          {stockWarning && <div className="message error">{stockWarning}</div>}

          <div className="form-grid">
            <div className="form-row">
              <label>Khách hàng</label>
              <select value={customerId} onChange={(event) => chooseCustomer(event.target.value)}>
                <option value="">Khách lẻ</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} {customer.phone ? `- ${customer.phone}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Tên khách</label>
              <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Khách lẻ" />
            </div>
            <div className="form-row">
              <label>Số điện thoại</label>
              <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
            </div>
            <div className="form-row">
              <label>Địa chỉ</label>
              <input value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} />
            </div>
            <div className="form-row full-row">
              <label>Ghi chú</label>
              <input value={note} onChange={(event) => setNote(event.target.value)} />
            </div>
          </div>

          <div className="panel-head" style={{ marginTop: 18 }}>
            <div>
              <h2>Sản phẩm bán</h2>
              <p>{items.length} dòng sản phẩm</p>
            </div>
            <button type="button" className="soft-btn compact" onClick={() => setItems([...items, { ...emptyItem }])}>
              <Plus size={17} />
              Thêm dòng
            </button>
          </div>

          <div className="line-items">
            {items.map((item, index) => {
              const product = productMap.get(item.product_id);
              const quantity = Number(item.quantity || 0);
              const overStock = product ? quantity > product.stock_quantity : false;

              return (
                <div className="line-item" key={index}>
                  <div className="form-row">
                    <label>Sản phẩm</label>
                    <select value={item.product_id} onChange={(event) => updateItem(index, { product_id: event.target.value })} required>
                      <option value="">Chọn sản phẩm</option>
                      {products.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.sku} - {entry.name} (còn {entry.stock_quantity})
                        </option>
                      ))}
                    </select>
                    {product && (
                      <span className={overStock ? "field-hint" : "field-hint"}>
                        Tồn hiện tại: {numberText(product.stock_quantity)}
                      </span>
                    )}
                  </div>
                  <div className="form-row">
                    <label>Số lượng</label>
                    <input
                      type="number"
                      min="1"
                      max={product?.stock_quantity ?? undefined}
                      value={item.quantity}
                      onChange={(event) => updateItem(index, { quantity: event.target.value })}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <label>Giá bán</label>
                    <input
                      type="number"
                      min="0"
                      value={item.unit_price}
                      onChange={(event) => updateItem(index, { unit_price: event.target.value })}
                      required
                    />
                  </div>
                  <button type="button" className="icon-btn" onClick={() => removeItem(index)} aria-label="Xóa dòng">
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="total-box">
            <div className="total-line">
              <span>Tổng số dòng</span>
              <strong>{numberText(items.length)}</strong>
            </div>
            <div className="total-line">
              <span>Tổng tiền đơn hàng</span>
              <strong>{money(totalAmount)}</strong>
            </div>
          </div>

          <div className="button-row">
            <button className="primary-btn" disabled={saving || products.length === 0 || Boolean(stockWarning)}>
              <Printer size={18} />
              {saving ? "Đang tạo..." : "Tạo đơn và in hóa đơn"}
            </button>
          </div>
        </form>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Đơn gần đây</h2>
              <p>In lại hóa đơn khi cần, không lưu file PDF hàng loạt.</p>
            </div>
          </div>

          {loading ? (
            <div className="message">Đang tải dữ liệu...</div>
          ) : orders.length === 0 ? (
            <EmptyState title="Chưa có đơn hàng" description="Tạo đơn bán đầu tiên để bắt đầu." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách</th>
                    <th>Thời gian</th>
                    <th>Tổng tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link href={`/orders/${order.id}/invoice`}>{order.code}</Link>
                      </td>
                      <td>{order.customer_name || "Khách lẻ"}</td>
                      <td>{dateTimeText(order.order_date)}</td>
                      <td>{money(order.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </>
  );
}
