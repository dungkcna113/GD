"use client";

import { FormEvent, useEffect, useState } from "react";
import { Edit3, History, Plus, RotateCcw, Save, Trash2, Truck } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { nextCode } from "@/lib/codes";
import { dateText, money } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { PurchaseOrder, Supplier } from "@/lib/types";

type SupplierForm = {
  id?: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  note: string;
};

const emptyForm: SupplierForm = {
  code: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  note: "",
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSuppliers() {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("suppliers")
      .select("*")
      .order("created_at", { ascending: false });
    if (loadError) setError(loadError.message);
    setSuppliers((data as Supplier[]) ?? []);
    setLoading(false);
  }

  async function loadHistory(supplier: Supplier) {
    setSelectedSupplier(supplier);
    const { data, error: historyError } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("supplier_id", supplier.id)
      .order("purchase_date", { ascending: false })
      .limit(20);

    if (historyError) {
      setError(historyError.message);
      return;
    }

    setOrders((data as PurchaseOrder[]) ?? []);
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  function editSupplier(supplier: Supplier) {
    setForm({
      id: supplier.id,
      code: supplier.code ?? "",
      name: supplier.name,
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      note: supplier.note ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const payload = {
      code: (form.code.trim() || nextCode("NCC", suppliers.map((supplier) => supplier.code))).toUpperCase(),
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      note: form.note.trim() || null,
    };

    const result = form.id
      ? await supabase.from("suppliers").update(payload).eq("id", form.id)
      : await supabase.from("suppliers").insert(payload);

    if (result.error) {
      setError(result.error.message);
    } else {
      setMessage(form.id ? "Đã cập nhật nhà cung cấp." : "Đã thêm nhà cung cấp.");
      setForm(emptyForm);
      await loadSuppliers();
    }

    setSaving(false);
  }

  async function deleteSupplier(id: string) {
    if (!confirm("Xóa nhà cung cấp này? Phiếu nhập cũ vẫn giữ dữ liệu tổng tiền.")) return;
    const { error: deleteError } = await supabase.from("suppliers").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setMessage("Đã xóa nhà cung cấp.");
    if (selectedSupplier?.id === id) {
      setSelectedSupplier(null);
      setOrders([]);
    }
    await loadSuppliers();
  }

  return (
    <>
      <PageHeader title="Nhà cung cấp" description="Quản lý mã nhà cung cấp, thông tin liên hệ và lịch sử nhập hàng." />

      <section className="split-layout">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>{form.id ? "Sửa nhà cung cấp" : "Thêm nhà cung cấp"}</h2>
              <p>Mã nhà cung cấp sẽ tự tạo dạng NCC-000001 nếu bạn để trống.</p>
            </div>
            {form.id && (
              <button className="soft-btn compact" onClick={() => setForm(emptyForm)}>
                <RotateCcw size={17} />
                Nhập mới
              </button>
            )}
          </div>

          {message && <div className="message success">{message}</div>}
          {error && <div className="message error">{error}</div>}

          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-row">
              <label>Mã nhà cung cấp</label>
              <input
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
                placeholder="Tự tạo nếu để trống"
              />
            </div>
            <div className="form-row">
              <label>Tên nhà cung cấp</label>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </div>
            <div className="form-row">
              <label>Số điện thoại</label>
              <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </div>
            <div className="form-row">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </div>
            <div className="form-row full-row">
              <label>Địa chỉ</label>
              <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
            </div>
            <div className="form-row full-row">
              <label>Ghi chú</label>
              <textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
            </div>
            <div className="button-row full-row">
              <button className="primary-btn" disabled={saving}>
                {form.id ? <Save size={18} /> : <Plus size={18} />}
                {saving ? "Đang lưu..." : form.id ? "Lưu thay đổi" : "Thêm nhà cung cấp"}
              </button>
            </div>
          </form>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Lịch sử nhập</h2>
              <p>{selectedSupplier ? `${selectedSupplier.code ?? ""} ${selectedSupplier.name}` : "Chọn nhà cung cấp để xem phiếu nhập."}</p>
            </div>
            <Truck size={22} color="#0f766e" />
          </div>

          {!selectedSupplier ? (
            <EmptyState title="Chưa chọn nhà cung cấp" description="Bấm Lịch sử ở danh sách bên dưới." />
          ) : orders.length === 0 ? (
            <EmptyState title="Chưa có phiếu nhập" description="Nhà cung cấp này chưa phát sinh nhập kho." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mã phiếu</th>
                    <th>Ngày nhập</th>
                    <th>Tổng tiền</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.code || "-"}</td>
                      <td>{dateText(order.purchase_date)}</td>
                      <td>{money(order.total_amount)}</td>
                      <td>{order.note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="panel" style={{ marginTop: 14 }}>
        <div className="panel-head">
          <div>
            <h2>Danh sách nhà cung cấp</h2>
            <p>{suppliers.length} nhà cung cấp</p>
          </div>
        </div>

        {loading ? (
          <div className="message">Đang tải nhà cung cấp...</div>
        ) : suppliers.length === 0 ? (
          <EmptyState title="Chưa có nhà cung cấp" description="Thêm nhà cung cấp trước khi lập phiếu nhập." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên</th>
                  <th>Số điện thoại</th>
                  <th>Email</th>
                  <th>Địa chỉ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>
                      <span className="badge">{supplier.code || "-"}</span>
                    </td>
                    <td>
                      <strong>{supplier.name}</strong>
                    </td>
                    <td>{supplier.phone || "-"}</td>
                    <td>{supplier.email || "-"}</td>
                    <td>{supplier.address || "-"}</td>
                    <td>
                      <div className="table-actions">
                        <button className="soft-btn compact" onClick={() => loadHistory(supplier)}>
                          <History size={16} />
                          Lịch sử
                        </button>
                        <button className="soft-btn compact" onClick={() => editSupplier(supplier)}>
                          <Edit3 size={16} />
                          Sửa
                        </button>
                        <button className="danger-btn compact" onClick={() => deleteSupplier(supplier.id)}>
                          <Trash2 size={16} />
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
