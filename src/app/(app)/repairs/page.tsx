"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Plus, Save, Trash2, Wrench } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { dateText, dateTimeText, money, numberText, todayInputValue } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { Customer, Product, RepairOrder, RepairStatus } from "@/lib/types";

type RepairPart = {
  product_id: string;
  quantity: string;
  unit_price: string;
};

const emptyPart: RepairPart = {
  product_id: "",
  quantity: "1",
  unit_price: "0",
};

const statusLabels: Record<RepairStatus, string> = {
  received: "Đã nhận",
  checking: "Đang kiểm tra",
  waiting_parts: "Chờ linh kiện",
  repairing: "Đang sửa",
  done: "Sửa xong",
  returned: "Đã trả khách",
  cancelled: "Hủy",
};

const statusTones: Record<RepairStatus, string> = {
  received: "badge",
  checking: "badge warn",
  waiting_parts: "badge warn",
  repairing: "badge warn",
  done: "badge ok",
  returned: "badge ok",
  cancelled: "badge danger",
};

export default function RepairsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [solution, setSolution] = useState("");
  const [promisedDate, setPromisedDate] = useState(todayInputValue());
  const [laborFee, setLaborFee] = useState("0");
  const [note, setNote] = useState("");
  const [parts, setParts] = useState<RepairPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const partsTotal = useMemo(
    () => parts.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0),
    [parts],
  );

  async function loadData() {
    setLoading(true);
    const [customerRes, productRes, orderRes] = await Promise.all([
      supabase.from("customers").select("*").order("name"),
      supabase.from("products").select("*").eq("is_active", true).order("name"),
      supabase.from("repair_orders").select("*").order("received_at", { ascending: false }).limit(30),
    ]);

    if (customerRes.error) setError(customerRes.error.message);
    if (productRes.error) setError(productRes.error.message);
    if (orderRes.error) setError(orderRes.error.message);

    setCustomers((customerRes.data as Customer[]) ?? []);
    setProducts((productRes.data as Product[]) ?? []);
    setOrders((orderRes.data as RepairOrder[]) ?? []);
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

  function updatePart(index: number, patch: Partial<RepairPart>) {
    setParts((current) =>
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

  function removePart(index: number) {
    setParts((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const payloadParts = parts
      .filter((item) => item.product_id)
      .map((item) => ({
        product_id: item.product_id,
        quantity: Number(item.quantity || 0),
        unit_price: Number(item.unit_price || 0),
      }));

    if (payloadParts.some((item) => item.quantity <= 0 || item.unit_price < 0)) {
      setError("Linh kiện sửa chữa phải có số lượng lớn hơn 0 và giá hợp lệ.");
      setSaving(false);
      return;
    }

    const { error: rpcError } = await supabase.rpc("create_repair_order", {
      p_customer_id: customerId || null,
      p_customer_name: customerName.trim(),
      p_customer_phone: customerPhone.trim() || null,
      p_customer_address: customerAddress.trim() || null,
      p_device_name: deviceName.trim(),
      p_serial_number: serialNumber.trim() || null,
      p_issue_description: issueDescription.trim(),
      p_diagnosis: diagnosis.trim() || null,
      p_solution: solution.trim() || null,
      p_promised_date: promisedDate || null,
      p_labor_fee: Number(laborFee || 0),
      p_note: note.trim() || null,
      p_items: payloadParts,
    });

    if (rpcError) {
      setError(rpcError.message);
      setSaving(false);
      return;
    }

    setMessage("Đã tạo phiếu sửa chữa.");
    setCustomerId("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setDeviceName("");
    setSerialNumber("");
    setIssueDescription("");
    setDiagnosis("");
    setSolution("");
    setPromisedDate(todayInputValue());
    setLaborFee("0");
    setNote("");
    setParts([]);
    await loadData();
    setSaving(false);
  }

  async function updateStatus(order: RepairOrder, status: RepairStatus) {
    setMessage(null);
    setError(null);

    const payload = {
      status,
      completed_at: status === "done" || status === "returned" ? new Date().toISOString() : order.completed_at,
    };

    const { error: updateError } = await supabase.from("repair_orders").update(payload).eq("id", order.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage(`Đã cập nhật trạng thái phiếu ${order.code}.`);
    await loadData();
  }

  return (
    <>
      <PageHeader
        title="Sửa chữa"
        description="Nhận sửa linh kiện/thiết bị, theo dõi trạng thái, công sửa và linh kiện thay thế."
      />

      <section className="split-layout">
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-head">
            <div>
              <h2>Phiếu sửa chữa mới</h2>
              <p>Mã phiếu sửa chữa tự tạo trong Supabase dạng SC-YYYYMMDD-00001.</p>
            </div>
            <Wrench size={24} color="#0f766e" />
          </div>

          {message && <div className="message success">{message}</div>}
          {error && <div className="message error">{error}</div>}

          <div className="form-grid">
            <div className="form-row">
              <label>Khách hàng</label>
              <select value={customerId} onChange={(event) => chooseCustomer(event.target.value)}>
                <option value="">Khách mới / khách lẻ</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.code ? `${customer.code} - ` : ""}
                    {customer.name} {customer.phone ? `- ${customer.phone}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Tên khách</label>
              <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required />
            </div>
            <div className="form-row">
              <label>Số điện thoại</label>
              <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
            </div>
            <div className="form-row">
              <label>Ngày hẹn trả</label>
              <input type="date" value={promisedDate} onChange={(event) => setPromisedDate(event.target.value)} />
            </div>
            <div className="form-row full-row">
              <label>Địa chỉ</label>
              <input value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} />
            </div>
            <div className="form-row">
              <label>Thiết bị / linh kiện nhận sửa</label>
              <input
                value={deviceName}
                onChange={(event) => setDeviceName(event.target.value)}
                placeholder="Laptop Dell, VGA GTX 1650, mainboard..."
                required
              />
            </div>
            <div className="form-row">
              <label>Serial / mã nhận dạng</label>
              <input value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} />
            </div>
            <div className="form-row full-row">
              <label>Tình trạng lỗi</label>
              <textarea value={issueDescription} onChange={(event) => setIssueDescription(event.target.value)} required />
            </div>
            <div className="form-row full-row">
              <label>Chẩn đoán</label>
              <textarea value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} />
            </div>
            <div className="form-row full-row">
              <label>Hướng xử lý</label>
              <textarea value={solution} onChange={(event) => setSolution(event.target.value)} />
            </div>
          </div>

          <div className="panel-head" style={{ marginTop: 18 }}>
            <div>
              <h2>Linh kiện dùng sửa</h2>
              <p>Có thể để trống nếu chỉ nhận kiểm tra hoặc chưa thay linh kiện.</p>
            </div>
            <button type="button" className="soft-btn compact" onClick={() => setParts([...parts, { ...emptyPart }])}>
              <Plus size={17} />
              Thêm linh kiện
            </button>
          </div>

          {parts.length > 0 && (
            <div className="line-items">
              {parts.map((item, index) => {
                const product = productMap.get(item.product_id);
                return (
                  <div className="line-item" key={index}>
                    <div className="form-row">
                      <label>Linh kiện</label>
                      <select value={item.product_id} onChange={(event) => updatePart(index, { product_id: event.target.value })}>
                        <option value="">Chọn linh kiện</option>
                        {products.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.sku} - {entry.name} (còn {entry.stock_quantity})
                          </option>
                        ))}
                      </select>
                      {product && <span className="field-hint">Tồn hiện tại: {numberText(product.stock_quantity)}</span>}
                    </div>
                    <div className="form-row">
                      <label>Số lượng</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(event) => updatePart(index, { quantity: event.target.value })}
                      />
                    </div>
                    <div className="form-row">
                      <label>Giá tính khách</label>
                      <input
                        type="number"
                        min="0"
                        value={item.unit_price}
                        onChange={(event) => updatePart(index, { unit_price: event.target.value })}
                      />
                    </div>
                    <button type="button" className="icon-btn" onClick={() => removePart(index)} aria-label="Xóa dòng">
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="form-grid" style={{ marginTop: 14 }}>
            <div className="form-row">
              <label>Công sửa</label>
              <input type="number" min="0" value={laborFee} onChange={(event) => setLaborFee(event.target.value)} />
            </div>
            <div className="form-row">
              <label>Tổng linh kiện</label>
              <input value={money(partsTotal)} readOnly />
            </div>
            <div className="form-row full-row">
              <label>Ghi chú</label>
              <input value={note} onChange={(event) => setNote(event.target.value)} />
            </div>
          </div>

          <div className="total-box">
            <div className="total-line">
              <span>Tổng dự kiến</span>
              <strong>{money(partsTotal + Number(laborFee || 0))}</strong>
            </div>
          </div>

          <div className="button-row">
            <button className="primary-btn" disabled={saving}>
              <Save size={18} />
              {saving ? "Đang lưu..." : "Tạo phiếu sửa chữa"}
            </button>
          </div>
        </form>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Phiếu sửa chữa gần đây</h2>
              <p>Theo dõi tiến độ xử lý cho khách.</p>
            </div>
            <ClipboardCheck size={22} color="#0f766e" />
          </div>

          {loading ? (
            <div className="message">Đang tải phiếu sửa chữa...</div>
          ) : orders.length === 0 ? (
            <EmptyState title="Chưa có phiếu sửa chữa" description="Tạo phiếu nhận sửa đầu tiên cho khách." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mã phiếu</th>
                    <th>Khách</th>
                    <th>Thiết bị</th>
                    <th>Ngày nhận</th>
                    <th>Hẹn trả</th>
                    <th>Trạng thái</th>
                    <th>Tổng tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>{order.code}</strong>
                      </td>
                      <td>
                        {order.customer_name}
                        <br />
                        <span className="muted">{order.customer_phone || "-"}</span>
                      </td>
                      <td>{order.device_name}</td>
                      <td>{dateTimeText(order.received_at)}</td>
                      <td>{dateText(order.promised_date)}</td>
                      <td>
                        <select
                          value={order.status}
                          onChange={(event) => updateStatus(order, event.target.value as RepairStatus)}
                        >
                          {Object.entries(statusLabels).map(([status, label]) => (
                            <option key={status} value={status}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <span className={statusTones[order.status]} style={{ marginTop: 6 }}>
                          {statusLabels[order.status]}
                        </span>
                      </td>
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
