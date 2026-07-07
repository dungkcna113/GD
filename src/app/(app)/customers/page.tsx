"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Edit3, History, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { dateTimeText, money } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { Customer, SalesOrder } from "@/lib/types";

type CustomerForm = {
  id?: string;
  name: string;
  phone: string;
  address: string;
  note: string;
};

const emptyForm: CustomerForm = {
  name: "",
  phone: "",
  address: "",
  note: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.address].filter(Boolean).join(" ").toLowerCase().includes(keyword),
    );
  }, [customers, search]);

  async function loadCustomers() {
    setLoading(true);
    const { data, error: loadError } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    if (loadError) setError(loadError.message);
    setCustomers((data as Customer[]) ?? []);
    setLoading(false);
  }

  async function loadHistory(customer: Customer) {
    setSelectedCustomer(customer);
    const { data, error: historyError } = await supabase
      .from("sales_orders")
      .select("*")
      .eq("customer_id", customer.id)
      .order("order_date", { ascending: false })
      .limit(20);

    if (historyError) {
      setError(historyError.message);
      return;
    }

    setOrders((data as SalesOrder[]) ?? []);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  function editCustomer(customer: Customer) {
    setForm({
      id: customer.id,
      name: customer.name,
      phone: customer.phone ?? "",
      address: customer.address ?? "",
      note: customer.note ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      note: form.note.trim() || null,
    };

    const result = form.id
      ? await supabase.from("customers").update(payload).eq("id", form.id)
      : await supabase.from("customers").insert(payload);

    if (result.error) {
      setError(result.error.message);
    } else {
      setMessage(form.id ? "Đã cập nhật khách hàng." : "Đã thêm khách hàng.");
      setForm(emptyForm);
      await loadCustomers();
    }

    setSaving(false);
  }

  async function deleteCustomer(id: string) {
    if (!confirm("Xóa khách hàng này? Lịch sử đơn hàng cũ vẫn giữ tên/số điện thoại trên hóa đơn.")) return;
    const { error: deleteError } = await supabase.from("customers").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setMessage("Đã xóa khách hàng.");
    if (selectedCustomer?.id === id) {
      setSelectedCustomer(null);
      setOrders([]);
    }
    await loadCustomers();
  }

  return (
    <>
      <PageHeader title="Khách hàng" description="Lưu tên, số điện thoại, địa chỉ và xem lịch sử mua hàng." />

      <section className="split-layout">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>{form.id ? "Sửa khách hàng" : "Thêm khách hàng"}</h2>
              <p>Số điện thoại dùng để tìm nhanh khi tạo đơn hàng.</p>
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
              <label>Tên khách hàng</label>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </div>
            <div className="form-row">
              <label>Số điện thoại</label>
              <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
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
                {saving ? "Đang lưu..." : form.id ? "Lưu thay đổi" : "Thêm khách"}
              </button>
            </div>
          </form>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Lịch sử mua hàng</h2>
              <p>{selectedCustomer ? selectedCustomer.name : "Chọn một khách hàng để xem đơn đã mua."}</p>
            </div>
            <History size={22} color="#ef233c" />
          </div>

          {!selectedCustomer ? (
            <EmptyState title="Chưa chọn khách" description="Bấm Lịch sử ở danh sách khách hàng." />
          ) : orders.length === 0 ? (
            <EmptyState title="Chưa có đơn" description="Khách hàng này chưa phát sinh đơn hàng." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Ngày</th>
                    <th>Tổng tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link href={`/orders/${order.id}/invoice`}>{order.code}</Link>
                      </td>
                      <td>{dateTimeText(order.order_date)}</td>
                      <td>{money(order.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="panel" style={{ marginTop: 14 }}>
        <div className="toolbar">
          <div>
            <h2>Danh sách khách hàng</h2>
            <p className="muted">{filteredCustomers.length} khách hàng</p>
          </div>
          <input
            className="search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm tên, số điện thoại, địa chỉ..."
          />
        </div>

        {loading ? (
          <div className="message">Đang tải khách hàng...</div>
        ) : filteredCustomers.length === 0 ? (
          <EmptyState title="Chưa có khách hàng" description="Bạn vẫn có thể bán cho khách lẻ khi tạo đơn." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Số điện thoại</th>
                  <th>Địa chỉ</th>
                  <th>Ghi chú</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <strong>{customer.name}</strong>
                    </td>
                    <td>{customer.phone || "-"}</td>
                    <td>{customer.address || "-"}</td>
                    <td>{customer.note || "-"}</td>
                    <td>
                      <div className="table-actions">
                        <button className="soft-btn compact" onClick={() => loadHistory(customer)}>
                          <History size={16} />
                          Lịch sử
                        </button>
                        <button className="soft-btn compact" onClick={() => editCustomer(customer)}>
                          <Edit3 size={16} />
                          Sửa
                        </button>
                        <button className="danger-btn compact" onClick={() => deleteCustomer(customer.id)}>
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
