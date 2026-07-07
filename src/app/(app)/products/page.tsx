"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Edit3, Hash, ImageIcon, PackagePlus, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { money, numberText, slugify } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { Category, Product } from "@/lib/types";

type ProductForm = {
  id?: string;
  sku: string;
  name: string;
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
  name: "",
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

const sampleProducts = [
  {
    sku: "CPU-I5-4590",
    name: "Intel Core i5-4590",
    category_slug: "cpu",
    cost_price: 350000,
    sale_price: 450000,
    stock_quantity: 10,
    low_stock_threshold: 3,
  },
  {
    sku: "RAM-KIN-8G-3200",
    name: "RAM Kingston Fury Beast 8GB DDR4 3200",
    category_slug: "ram",
    cost_price: 350000,
    sale_price: 450000,
    stock_quantity: 15,
    low_stock_threshold: 5,
  },
  {
    sku: "SSD-KIN-A400-240",
    name: "SSD Kingston A400 240GB SATA",
    category_slug: "ssd",
    cost_price: 330000,
    sale_price: 420000,
    stock_quantity: 12,
    low_stock_threshold: 4,
  },
  {
    sku: "VGA-ASUS-GTX1650-4G",
    name: "VGA ASUS GTX 1650 4GB",
    category_slug: "vga",
    cost_price: 2450000,
    sale_price: 2850000,
    stock_quantity: 4,
    low_stock_threshold: 2,
  },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return products;
    return products.filter((item) =>
      [item.sku, item.name, item.category_name].filter(Boolean).join(" ").toLowerCase().includes(keyword),
    );
  }, [products, search]);

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

  function generateSku() {
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

    setForm((current) => ({ ...current, sku: nextSku }));
  }

  function editProduct(product: Product) {
    setForm({
      id: product.id,
      sku: product.sku,
      name: product.name,
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
      sku: form.sku.trim().toUpperCase(),
      name: form.name.trim(),
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

  async function addSampleProducts() {
    setSeeding(true);
    setMessage(null);
    setError(null);

    const categoryIds = new Map(categories.map((category) => [category.slug, category.id]));
    const missingCategory = sampleProducts.find((product) => !categoryIds.get(product.category_slug));

    if (missingCategory) {
      setError("Thiếu danh mục mẫu. Hãy chạy lại file supabase/schema.sql trong Supabase SQL Editor trước.");
      setSeeding(false);
      return;
    }

    const payload = sampleProducts.map(({ category_slug, ...product }) => ({
      ...product,
      category_id: categoryIds.get(category_slug),
      image_url: null,
      is_active: true,
    }));

    const { error: upsertError } = await supabase.from("products").upsert(payload, { onConflict: "sku" });

    if (upsertError) {
      setError(upsertError.message);
    } else {
      setMessage("Đã thêm 4 sản phẩm mẫu có mã quản lý.");
      await loadData();
    }

    setSeeding(false);
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
      <PageHeader
        title="Sản phẩm"
        description="Quản lý mã sản phẩm, giá nhập, giá bán, tồn kho và link ảnh sản phẩm."
      >
        <button className="soft-btn" onClick={addSampleProducts} disabled={seeding || loading}>
          <PackagePlus size={18} />
          {seeding ? "Đang thêm..." : "Thêm 4 sản phẩm mẫu"}
        </button>
      </PageHeader>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{form.id ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h2>
            <p>Ảnh sản phẩm chỉ lưu link URL, không lưu file ảnh trong Supabase.</p>
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
            <label>Mã sản phẩm</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={form.sku} onChange={(event) => updateField("sku", event.target.value)} required />
              <button type="button" className="soft-btn compact" onClick={generateSku}>
                <Hash size={16} />
                Tạo mã
              </button>
            </div>
          </div>
          <div className="form-row">
            <label>Tên sản phẩm</label>
            <input value={form.name} onChange={(event) => updateField("name", event.target.value)} required />
          </div>
          <div className="form-row">
            <label>Danh mục</label>
            <select value={form.category_id} onChange={(event) => updateField("category_id", event.target.value)}>
              <option value="">Chưa chọn</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Link ảnh</label>
            <input
              value={form.image_url}
              onChange={(event) => updateField("image_url", event.target.value)}
              placeholder="https://..."
            />
            <span className="field-hint">Có thể để trống để tiết kiệm dung lượng.</span>
          </div>
          <div className="form-row">
            <label>Giá nhập</label>
            <input
              type="number"
              min="0"
              value={form.cost_price}
              onChange={(event) => updateField("cost_price", event.target.value)}
            />
          </div>
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
            <label>Tồn kho</label>
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
          <div className="form-row full-row">
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
          <div className="button-row full-row">
            <button className="primary-btn" disabled={saving}>
              {form.id ? <Save size={18} /> : <Plus size={18} />}
              {saving ? "Đang lưu..." : form.id ? "Lưu thay đổi" : "Thêm sản phẩm"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel" style={{ marginTop: 14 }}>
        <div className="toolbar">
          <div>
            <h2>Danh sách sản phẩm</h2>
            <p className="muted">{numberText(filteredProducts.length)} sản phẩm</p>
          </div>
          <input
            className="search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm mã, tên, danh mục..."
          />
        </div>

        {loading ? (
          <div className="message">Đang tải sản phẩm...</div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState title="Chưa có sản phẩm" description="Thêm sản phẩm để bắt đầu nhập kho và bán hàng." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Giá nhập</th>
                  <th>Giá bán</th>
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
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} />
                          ) : (
                            <ImageIcon size={18} />
                          )}
                        </div>
                        <div className="product-meta">
                          <strong>{product.name}</strong>
                          <span>{product.sku}</span>
                        </div>
                      </div>
                    </td>
                    <td>{product.category_name || "-"}</td>
                    <td>{money(product.cost_price)}</td>
                    <td>{money(product.sale_price)}</td>
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
                        <button className="soft-btn compact" onClick={() => editProduct(product)}>
                          <Edit3 size={16} />
                          Sửa
                        </button>
                        <button className="danger-btn compact" onClick={() => deleteProduct(product.id)}>
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
