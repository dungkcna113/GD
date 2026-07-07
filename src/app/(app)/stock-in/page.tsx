"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PackagePlus, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { dateText, money, numberText, todayInputValue } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { Product, PurchaseOrder, Supplier } from "@/lib/types";

type StockItem = {
  product_id: string;
  quantity: string;
  unit_cost: string;
};

type PurchaseOrderRow = PurchaseOrder & {
  suppliers?: { name: string } | null;
};

const emptyItem: StockItem = {
  product_id: "",
  quantity: "1",
  unit_cost: "0",
};

export default function StockInPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderRow[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayInputValue());
  const [note, setNote] = useState("");
  const [items, setItems] = useState<StockItem[]>([{ ...emptyItem }]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_cost || 0), 0),
    [items],
  );

  async function loadData() {
    setLoading(true);
    const [supplierRes, productRes, orderRes] = await Promise.all([
      supabase.from("suppliers").select("*").order("name"),
      supabase.from("products").select("*").eq("is_active", true).order("name"),
      supabase.from("purchase_orders").select("*, suppliers(name)").order("created_at", { ascending: false }).limit(12),
    ]);

    if (supplierRes.error) setError(supplierRes.error.message);
    if (productRes.error) setError(productRes.error.message);
    if (orderRes.error) setError(orderRes.error.message);

    setSuppliers((supplierRes.data as Supplier[]) ?? []);
    setProducts((productRes.data as Product[]) ?? []);
    setOrders((orderRes.data as PurchaseOrderRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateItem(index: number, patch: Partial<StockItem>) {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = { ...item, ...patch };
        if (patch.product_id) {
          const product = products.find((entry) => entry.id === patch.product_id);
          if (product) next.unit_cost = String(product.cost_price ?? 0);
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

    const payloadItems = items.map((item) => ({
      product_id: item.product_id,
      quantity: Number(item.quantity || 0),
      unit_cost: Number(item.unit_cost || 0),
    }));

    if (payloadItems.some((item) => !item.product_id || item.quantity <= 0 || item.unit_cost < 0)) {
      setError("Vui lòng chọn sản phẩm, nhập số lượng lớn hơn 0 và giá nhập hợp lệ.");
      setSaving(false);
      return;
    }

    const { error: rpcError } = await supabase.rpc("create_purchase_order", {
      p_supplier_id: supplierId || null,
      p_purchase_date: purchaseDate,
      p_note: note.trim() || null,
      p_items: payloadItems,
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setMessage("Đã tạo phiếu nhập và cập nhật tồn kho.");
      setSupplierId("");
      setPurchaseDate(todayInputValue());
      setNote("");
      setItems([{ ...emptyItem }]);
      await loadData();
    }

    setSaving(false);
  }

  return (
    <>
      <PageHeader
        title="Nhập kho"
        description="Tạo phiếu nhập, tự tính thành tiền và tăng tồn kho sản phẩm."
      />

      <section className="split-layout">
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-head">
            <div>
              <h2>Phiếu nhập mới</h2>
              <p>Giá nhập mới sẽ cập nhật vào giá vốn hiện tại của sản phẩm.</p>
            </div>
            <PackagePlus size={24} color="#ef233c" />
          </div>

          {message && <div className="message success">{message}</div>}
          {error && <div className="message error">{error}</div>}

          <div className="form-grid">
            <div className="form-row">
              <label>Nhà cung cấp</label>
              <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
                <option value="">Chưa chọn</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Ngày nhập</label>
              <input type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} required />
            </div>
            <div className="form-row full-row">
              <label>Ghi chú</label>
              <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Số phiếu, ghi chú lô hàng..." />
            </div>
          </div>

          <div className="panel-head" style={{ marginTop: 18 }}>
            <div>
              <h2>Sản phẩm nhập</h2>
              <p>{items.length} dòng sản phẩm</p>
            </div>
            <button type="button" className="soft-btn compact" onClick={() => setItems([...items, { ...emptyItem }])}>
              <Plus size={17} />
              Thêm dòng
            </button>
          </div>

          <div className="line-items">
            {items.map((item, index) => (
              <div className="line-item" key={index}>
                <div className="form-row">
                  <label>Sản phẩm</label>
                  <select value={item.product_id} onChange={(event) => updateItem(index, { product_id: event.target.value })} required>
                    <option value="">Chọn sản phẩm</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.sku} - {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <label>Số lượng</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(event) => updateItem(index, { quantity: event.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <label>Giá nhập</label>
                  <input
                    type="number"
                    min="0"
                    value={item.unit_cost}
                    onChange={(event) => updateItem(index, { unit_cost: event.target.value })}
                    required
                  />
                </div>
                <button type="button" className="icon-btn" onClick={() => removeItem(index)} aria-label="Xóa dòng">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          <div className="total-box">
            <div className="total-line">
              <span>Tổng số dòng</span>
              <strong>{numberText(items.length)}</strong>
            </div>
            <div className="total-line">
              <span>Tổng tiền nhập</span>
              <strong>{money(totalAmount)}</strong>
            </div>
          </div>

          <div className="button-row">
            <button className="primary-btn" disabled={saving || products.length === 0}>
              <PackagePlus size={18} />
              {saving ? "Đang nhập..." : "Tạo phiếu nhập"}
            </button>
          </div>
        </form>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Phiếu nhập gần đây</h2>
              <p>Kiểm tra nhanh lịch sử nhập kho.</p>
            </div>
          </div>

          {loading ? (
            <div className="message">Đang tải dữ liệu...</div>
          ) : orders.length === 0 ? (
            <EmptyState title="Chưa có phiếu nhập" description="Tạo phiếu nhập đầu tiên sau khi có sản phẩm." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Nhà cung cấp</th>
                    <th>Tổng tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>{dateText(order.purchase_date)}</td>
                      <td>{order.suppliers?.name || "Chưa chọn"}</td>
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
