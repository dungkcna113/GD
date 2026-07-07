"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bold,
  Code2,
  Edit3,
  Hash,
  ImageIcon,
  Italic,
  ListFilter,
  MoreHorizontal,
  Plus,
  Save,
  Trash2,
  Underline,
  Upload,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { money, numberText, slugify } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { Category, Product } from "@/lib/types";

type ProductForm = {
  id?: string;
  sku: string;
  barcode: string;
  name: string;
  unit: string;
  description: string;
  category_id: string;
  cost_price: string;
  sale_price: string;
  image_url: string;
  stock_quantity: string;
  low_stock_threshold: string;
  is_active: boolean;
};

const emptyForm: ProductForm = {
  sku: "",
  barcode: "",
  name: "",
  unit: "cái",
  description: "",
  category_id: "",
  cost_price: "0",
  sale_price: "0",
  image_url: "",
  stock_quantity: "0",
  low_stock_threshold: "5",
  is_active: true,
};

const categoryPrefixes: Record<string, string> = {
  cpu: "CPU",
  ram: "RAM",
  ssd: "SSD",
  vga: "VGA",
  mainboard: "MAIN",
  psu: "PSU",
  "man-hinh": "MON",
  laptop: "LAP",
  "phu-kien": "PK",
  "dich-vu": "DV",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return products.filter((item) => {
      const matchesSearch =
        !keyword ||
        [item.sku, item.barcode, item.name, item.category_name].filter(Boolean).join(" ").toLowerCase().includes(keyword);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.is_active) ||
        (statusFilter === "inactive" && !item.is_active) ||
        (statusFilter === "low" && item.stock_quantity <= item.low_stock_threshold);
      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

  async function loadData() {
    setLoading(true);
    const [productRes, categoryRes] = await Promise.all([
      supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").eq("is_active", true).order("name"),
    ]);

    if (productRes.error) setError(productRes.error.message);
    if (categoryRes.error) setError(categoryRes.error.message);

    const mapped = ((productRes.data ?? []) as Array<Product & { categories?: { name: string } | null }>).map(
      (item) => ({
        ...item,
        category_name: item.categories?.name ?? null,
      }),
    );

    setProducts(mapped);
    setCategories((categoryRes.data as Category[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateField<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function buildSku() {
    const category = categories.find((item) => item.id === form.category_id);
    const prefix = category ? categoryPrefixes[category.slug] ?? category.slug.slice(0, 3).toUpperCase() : "SP";
    const namePart =
      slugify(form.name)
        .toUpperCase()
        .split("-")
        .filter(Boolean)
        .slice(0, 4)
        .join("-") || String(products.length + 1).padStart(4, "0");
    const baseSku = `${prefix}-${namePart}`;
    const existingSkus = new Set(products.map((product) => product.sku.toUpperCase()));

    let nextSku = baseSku;
    let counter = 2;
    while (existingSkus.has(nextSku.toUpperCase())) {
      nextSku = `${baseSku}-${counter}`;
      counter += 1;
    }

    return nextSku;
  }

  function generateSku() {
    setForm((current) => ({ ...current, sku: buildSku() }));
  }

  function resetForm() {
    setForm(emptyForm);
    setMessage(null);
    setError(null);
  }

  function editProduct(product: Product) {
    setForm({
      id: product.id,
      sku: product.sku,
      barcode: product.barcode ?? "",
      name: product.name,
      unit: product.unit ?? "cái",
      description: product.description ?? "",
      category_id: product.category_id ?? "",
      cost_price: String(product.cost_price ?? 0),
      sale_price: String(product.sale_price ?? 0),
      image_url: product.image_url ?? "",
      stock_quantity: String(product.stock_quantity ?? 0),
      low_stock_threshold: String(product.low_stock_threshold ?? 5),
      is_active: product.is_active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const payload = {
      sku: (form.sku.trim() || buildSku()).toUpperCase(),
      barcode: form.barcode.trim() || null,
      name: form.name.trim(),
      unit: form.unit.trim() || "cái",
      description: form.description.trim() || null,
      category_id: form.category_id || null,
      cost_price: Number(form.cost_price || 0),
      sale_price: Number(form.sale_price || 0),
      image_url: form.image_url.trim() || null,
      stock_quantity: Number(form.stock_quantity || 0),
      low_stock_threshold: Number(form.low_stock_threshold || 0),
      is_active: form.is_active,
    };

    const result = form.id
      ? await supabase.from("products").update(payload).eq("id", form.id)
      : await supabase.from("products").insert(payload);

    if (result.error) {
      setError(result.error.message);
    } else {
      setMessage(form.id ? "Đã cập nhật sản phẩm." : "Đã thêm sản phẩm mới.");
      setForm(emptyForm);
      await loadData();
    }

    setSaving(false);
  }

  async function deleteProduct(id: string) {
    if (!confirm("Xóa sản phẩm này? Nếu sản phẩm đã có đơn hàng, hãy chuyển sang ngừng bán thay vì xóa.")) return;

    const { error: deleteError } = await supabase.from("products").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage("Đã xóa sản phẩm.");
    await loadData();
  }

  return (
    <>
      <PageHeader title={form.id ? "Sửa sản phẩm" : "Thêm sản phẩm"} description="Quản lý thông tin, giá bán, giá vốn và tồn kho.">
        <button className="soft-btn" type="button" onClick={resetForm}>
          <ArrowLeft size={17} />
          Hủy
        </button>
        <button className="primary-btn" form="product-form" disabled={saving}>
          <Save size={17} />
          {saving ? "Đang lưu..." : form.id ? "Lưu sản phẩm" : "Thêm sản phẩm"}
        </button>
      </PageHeader>

      {message && <div className="message success">{message}</div>}
      {error && <div className="message error">{error}</div>}

      <form id="product-form" className="product-editor" onSubmit={handleSubmit}>
        <div className="product-main">
          <section className="sapo-card">
            <div className="card-head">
              <h2>Thông tin sản phẩm</h2>
            </div>

            <div className="form-grid">
              <div className="form-row full-row">
                <label>Tên sản phẩm*</label>
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Nhập tên sản phẩm"
                  required
                />
              </div>
              <div className="form-row">
                <label>Mã SKU</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={form.sku}
                    onChange={(event) => updateField("sku", event.target.value)}
                    placeholder="Tự tạo nếu để trống"
                  />
                  <button type="button" className="soft-btn compact" onClick={generateSku}>
                    <Hash size={16} />
                    Tạo mã
                  </button>
                </div>
              </div>
              <div className="form-row">
                <label>Mã vạch / Barcode</label>
                <input
                  value={form.barcode}
                  onChange={(event) => updateField("barcode", event.target.value)}
                  placeholder="Nhập mã vạch nếu có"
                />
              </div>
              <div className="form-row">
                <label>Đơn vị tính</label>
                <input value={form.unit} onChange={(event) => updateField("unit", event.target.value)} placeholder="cái" />
              </div>
              <div className="form-row full-row">
                <label>Mô tả</label>
                <div className="editor-box">
                  <div className="editor-toolbar">
                    <Bold size={16} />
                    <Italic size={16} />
                    <Underline size={16} />
                    <ImageIcon size={16} />
                    <Code2 size={16} />
                    <MoreHorizontal size={16} />
                  </div>
                  <textarea
                    className="editor-textarea"
                    value={form.description}
                    onChange={(event) => updateField("description", event.target.value)}
                    placeholder="Nhập mô tả sản phẩm"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="sapo-card">
            <div className="card-head">
              <h2>Thông tin giá</h2>
            </div>
            <div className="form-grid">
              <div className="form-row">
                <label>Giá bán</label>
                <input
                  type="number"
                  min="0"
                  value={form.sale_price}
                  onChange={(event) => updateField("sale_price", event.target.value)}
                />
              </div>
              <div className="form-row">
                <label>Giá vốn</label>
                <input
                  type="number"
                  min="0"
                  value={form.cost_price}
                  onChange={(event) => updateField("cost_price", event.target.value)}
                />
              </div>
              <div className="form-row">
                <label>Tồn kho ban đầu</label>
                <input
                  type="number"
                  min="0"
                  value={form.stock_quantity}
                  onChange={(event) => updateField("stock_quantity", event.target.value)}
                />
              </div>
              <div className="form-row">
                <label>Ngưỡng tồn thấp</label>
                <input
                  type="number"
                  min="0"
                  value={form.low_stock_threshold}
                  onChange={(event) => updateField("low_stock_threshold", event.target.value)}
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="side-stack">
          <section className="sapo-card">
            <div className="card-head">
              <h2>Ảnh sản phẩm</h2>
            </div>
            <div className="image-drop">
              <div>
                <Upload size={24} />
                <strong>Thêm ảnh từ URL</strong>
                <p className="muted">Không lưu file ảnh trong database.</p>
              </div>
            </div>
            <div className="form-row" style={{ marginTop: 12 }}>
              <label>Link ảnh</label>
              <input
                value={form.image_url}
                onChange={(event) => updateField("image_url", event.target.value)}
                placeholder="https://..."
              />
            </div>
          </section>

          <section className="sapo-card">
            <div className="card-head">
              <h2>Phân loại</h2>
            </div>
            <div className="form-row">
              <label>Danh mục</label>
              <select value={form.category_id} onChange={(event) => updateField("category_id", event.target.value)}>
                <option value="">Chọn danh mục</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row" style={{ marginTop: 12 }}>
              <label>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => updateField("is_active", event.target.checked)}
                  style={{ width: 16, minHeight: 16, marginRight: 8 }}
                />
                Đang kinh doanh
              </label>
            </div>
          </section>
        </aside>
      </form>

      <section className="table-panel" style={{ marginTop: 16 }}>
        <div className="list-head" style={{ padding: "16px 20px" }}>
          <div>
            <h2 style={{ margin: 0 }}>Danh sách sản phẩm</h2>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              {numberText(filteredProducts.length)} sản phẩm
            </p>
          </div>
          <button className="soft-btn compact" type="button">
            <ListFilter size={16} />
            Bộ lọc khác
          </button>
        </div>
        <div className="filter-row">
          <input
            className="search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo mã SKU, tên sản phẩm, barcode"
          />
          <select className="filter-control" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang kinh doanh</option>
            <option value="inactive">Ngừng bán</option>
            <option value="low">Tồn kho thấp</option>
          </select>
        </div>

        {loading ? (
          <div className="message" style={{ margin: 20 }}>
            Đang tải sản phẩm...
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState title="Chưa có sản phẩm" description="Thêm sản phẩm để bắt đầu nhập kho và bán hàng." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>SKU</th>
                  <th>Barcode</th>
                  <th>Đơn vị</th>
                  <th>Danh mục</th>
                  <th>Giá bán</th>
                  <th>Giá vốn</th>
                  <th>Tồn kho</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="product-cell">
                        <div className="product-thumb">
                          {product.image_url ? <img src={product.image_url} alt={product.name} /> : <ImageIcon size={18} />}
                        </div>
                        <div className="product-meta">
                          <strong>{product.name}</strong>
                          <span>{product.description || "Chưa có mô tả"}</span>
                        </div>
                      </div>
                    </td>
                    <td>{product.sku}</td>
                    <td>{product.barcode || "-"}</td>
                    <td>{product.unit || "cái"}</td>
                    <td>{product.category_name || "-"}</td>
                    <td>{money(product.sale_price)}</td>
                    <td>{money(product.cost_price)}</td>
                    <td>
                      <span className={product.stock_quantity <= product.low_stock_threshold ? "badge warn" : "badge ok"}>
                        {numberText(product.stock_quantity)}
                      </span>
                    </td>
                    <td>
                      <span className={product.is_active ? "badge ok" : "badge danger"}>
                        {product.is_active ? "Đang bán" : "Ngừng bán"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="soft-btn compact" type="button" onClick={() => editProduct(product)}>
                          <Edit3 size={16} />
                          Sửa
                        </button>
                        <button className="danger-btn compact" type="button" onClick={() => deleteProduct(product.id)}>
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
