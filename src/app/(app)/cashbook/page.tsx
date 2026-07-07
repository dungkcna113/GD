"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Download, ListFilter, Plus, Save, Wallet } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { dateText, money, numberText, todayInputValue } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { CashEntry } from "@/lib/types";

type CashForm = {
  entry_type: "receipt" | "payment";
  cash_account: "cash" | "bank";
  entry_date: string;
  partner_name: string;
  reason: string;
  amount: string;
  note: string;
};

const emptyForm: CashForm = {
  entry_type: "receipt",
  cash_account: "cash",
  entry_date: todayInputValue(),
  partner_name: "",
  reason: "",
  amount: "",
  note: "",
};

export default function CashbookPage() {
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [form, setForm] = useState<CashForm>(emptyForm);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesTab = activeTab === "all" || entry.cash_account === activeTab;
      const matchesSearch =
        !keyword ||
        [entry.code, entry.partner_name, entry.reason, entry.note].filter(Boolean).join(" ").toLowerCase().includes(keyword);
      return matchesTab && matchesSearch;
    });
  }, [entries, activeTab, search]);

  const summary = useMemo(() => {
    const totalReceipt = entries.filter((entry) => entry.entry_type === "receipt").reduce((sum, entry) => sum + entry.amount, 0);
    const totalPayment = entries.filter((entry) => entry.entry_type === "payment").reduce((sum, entry) => sum + entry.amount, 0);
    const cashBalance = entries.reduce((sum, entry) => {
      if (entry.cash_account !== "cash") return sum;
      return sum + (entry.entry_type === "receipt" ? entry.amount : -entry.amount);
    }, 0);
    const bankBalance = entries.reduce((sum, entry) => {
      if (entry.cash_account !== "bank") return sum;
      return sum + (entry.entry_type === "receipt" ? entry.amount : -entry.amount);
    }, 0);
    return { totalReceipt, totalPayment, cashBalance, bankBalance, balance: totalReceipt - totalPayment };
  }, [entries]);

  async function loadEntries() {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("cash_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (loadError) setError(loadError.message);
    setEntries((data as CashEntry[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadEntries();
  }, []);

  function updateField<K extends keyof CashForm>(key: K, value: CashForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const { error: rpcError } = await supabase.rpc("create_cash_entry", {
      p_entry_type: form.entry_type,
      p_cash_account: form.cash_account,
      p_entry_date: form.entry_date,
      p_partner_name: form.partner_name.trim() || null,
      p_reason: form.reason.trim(),
      p_amount: Number(form.amount || 0),
      p_note: form.note.trim() || null,
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setMessage("Đã tạo phiếu thu/chi.");
      setForm(emptyForm);
      await loadEntries();
    }

    setSaving(false);
  }

  return (
    <>
      <PageHeader title="Sổ quỹ" description="Theo dõi thu chi tiền mặt và tiền gửi từ bán hàng, nhập hàng và phiếu thủ công.">
        <button className="soft-btn" type="button">
          <Download size={17} />
          Xuất file
        </button>
        <button className="soft-btn" type="button">
          Lý do thu chi
        </button>
      </PageHeader>

      {message && <div className="message success">{message}</div>}
      {error && <div className="message error">{error}</div>}

      <section className="summary-strip">
        <div className="summary-item">
          <span>Quỹ đầu kỳ</span>
          <strong>{money(0)}</strong>
        </div>
        <div className="summary-item">
          <span>Tổng thu</span>
          <strong className="money-in">{money(summary.totalReceipt)}</strong>
        </div>
        <div className="summary-item">
          <span>Tổng chi</span>
          <strong className="money-out">{money(summary.totalPayment)}</strong>
        </div>
        <div className="summary-item">
          <span>Tồn quỹ</span>
          <strong className={summary.balance >= 0 ? "money-in" : "money-out"}>{money(summary.balance)}</strong>
        </div>
      </section>

      <section className="split-layout">
        <div className="table-panel">
          <div className="tabs">
            <button className={`tab-btn ${activeTab === "all" ? "active" : ""}`} type="button" onClick={() => setActiveTab("all")}>
              Tổng quỹ
            </button>
            <button className={`tab-btn ${activeTab === "cash" ? "active" : ""}`} type="button" onClick={() => setActiveTab("cash")}>
              Quỹ tiền mặt
            </button>
            <button className={`tab-btn ${activeTab === "bank" ? "active" : ""}`} type="button" onClick={() => setActiveTab("bank")}>
              Quỹ tiền gửi
            </button>
          </div>
          <div className="filter-row">
            <input
              className="search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo mã phiếu, đối tượng, lý do thu chi"
            />
            <button className="soft-btn compact" type="button">
              <ListFilter size={16} />
              Bộ lọc khác
            </button>
          </div>

          {loading ? (
            <div className="message" style={{ margin: 20 }}>
              Đang tải sổ quỹ...
            </div>
          ) : filteredEntries.length === 0 ? (
            <EmptyState title="Chưa có phiếu thu chi" description="Phiếu bán hàng và nhập hàng sẽ tự ghi nhận vào sổ quỹ." />
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Mã phiếu</th>
                      <th>Ngày ghi nhận</th>
                      <th>Tên đối tượng</th>
                      <th>Lý do thu chi</th>
                      <th>Quỹ</th>
                      <th>Số tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="link-blue">{entry.code}</td>
                        <td>{dateText(entry.entry_date)}</td>
                        <td>{entry.partner_name || "-"}</td>
                        <td>{entry.reason}</td>
                        <td>{entry.cash_account === "cash" ? "Tiền mặt" : "Tiền gửi"}</td>
                        <td className={entry.entry_type === "receipt" ? "money-in" : "money-out"}>
                          {entry.entry_type === "receipt" ? "" : "-"}
                          {money(entry.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="filter-row">
                <span>
                  Từ 1 đến {numberText(filteredEntries.length)} trên tổng {numberText(entries.length)}
                </span>
                <div className="filters">
                  <span className="badge ok">Tiền mặt: {money(summary.cashBalance)}</span>
                  <span className="badge info">Tiền gửi: {money(summary.bankBalance)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-head">
            <div>
              <h2>Tạo phiếu thu/chi</h2>
              <p>Ghi nhận các khoản thu chi ngoài bán hàng và nhập hàng.</p>
            </div>
            <Wallet size={22} color="#0b84ff" />
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label>Loại phiếu</label>
              <select value={form.entry_type} onChange={(event) => updateField("entry_type", event.target.value as CashForm["entry_type"])}>
                <option value="receipt">Phiếu thu</option>
                <option value="payment">Phiếu chi</option>
              </select>
            </div>
            <div className="form-row">
              <label>Quỹ</label>
              <select
                value={form.cash_account}
                onChange={(event) => updateField("cash_account", event.target.value as CashForm["cash_account"])}
              >
                <option value="cash">Tiền mặt</option>
                <option value="bank">Tiền gửi</option>
              </select>
            </div>
            <div className="form-row">
              <label>Ngày ghi nhận</label>
              <input type="date" value={form.entry_date} onChange={(event) => updateField("entry_date", event.target.value)} />
            </div>
            <div className="form-row">
              <label>Số tiền</label>
              <input
                type="number"
                min="0"
                value={form.amount}
                onChange={(event) => updateField("amount", event.target.value)}
                required
              />
            </div>
            <div className="form-row full-row">
              <label>Tên đối tượng</label>
              <input value={form.partner_name} onChange={(event) => updateField("partner_name", event.target.value)} />
            </div>
            <div className="form-row full-row">
              <label>Lý do thu chi</label>
              <input value={form.reason} onChange={(event) => updateField("reason", event.target.value)} required />
            </div>
            <div className="form-row full-row">
              <label>Ghi chú</label>
              <textarea value={form.note} onChange={(event) => updateField("note", event.target.value)} />
            </div>
          </div>

          <div className="button-row">
            <button className="primary-btn" disabled={saving}>
              {saving ? <Plus size={17} /> : <Save size={17} />}
              {saving ? "Đang lưu..." : "Tạo phiếu"}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
