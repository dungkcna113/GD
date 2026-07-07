"use client";

import { FormEvent, useEffect, useState } from "react";
import { Edit3, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { slugify } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { Category } from "@/lib/types";

type CategoryForm = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
};

const emptyForm: CategoryForm = {
  name: "",
  slug: "",
  description: "",
  is_active: true,
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const { data, error: loadError } = await supabase.from("categories").select("*").order("name");
    if (loadError) setError(loadError.message);
    setCategories((data as Category[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateName(name: string) {
    setForm((current) => ({
      ...current,
      name,
      slug: current.id ? current.slug : slugify(name),
    }));
  }

  function editCategory(category: Category) {
    setForm({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      is_active: category.is_active,
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
      slug: slugify(form.slug || form.name),
      description: form.description.trim() || null,
      is_active: form.is_active,
    };

    const result = form.id
      ? await supabase.from("categories").update(payload).eq("id", form.id)
      : await supabase.from("categories").insert(payload);

    if (result.error) {
      setError(result.error.message);
    } else {
      setMessage(form.id ? "Đã cập nhật danh mục." : "Đã thêm danh mục.");
      setForm(emptyForm);
      await loadData();
    }

    setSaving(false);
  }

  async function deleteCategory(id: string) {
    if (!confirm("Xóa danh mục này? Nếu đã có sản phẩm, hãy chuyển sang ngừng dùng.")) return;
    const { error: deleteError } = await supabase.from("categories").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setMessage("Đã xóa danh mục.");
    await loadData();
  }

  return (
    <>
      <PageHeader title="Danh mục" description="Sắp xếp sản phẩm theo nhóm linh kiện và dịch vụ." />

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{form.id ? "Sửa danh mục" : "Thêm danh mục"}</h2>
            <p>Danh mục mặc định đã có đủ nhóm linh kiện phổ biến cho GD COMPUTER.</p>
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
            <label>Tên danh mục</label>
            <input value={form.name} onChange={(event) => updateName(event.target.value)} required />
          </div>
          <div className="form-row">
            <label>Slug</label>
            <input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} required />
          </div>
          <div className="form-row full-row">
            <label>Mô tả</label>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
          <div className="form-row full-row">
            <label>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                style={{ width: 16, minHeight: 16, marginRight: 8 }}
              />
              Đang dùng
            </label>
          </div>
          <div className="button-row full-row">
            <button className="primary-btn" disabled={saving}>
              {form.id ? <Save size={18} /> : <Plus size={18} />}
              {saving ? "Đang lưu..." : form.id ? "Lưu thay đổi" : "Thêm danh mục"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel" style={{ marginTop: 14 }}>
        <div className="panel-head">
          <div>
            <h2>Danh sách danh mục</h2>
            <p>Nhân viên có thể dùng danh mục đang bật khi thêm sản phẩm.</p>
          </div>
        </div>

        {loading ? (
          <div className="message">Đang tải danh mục...</div>
        ) : categories.length === 0 ? (
          <EmptyState title="Chưa có danh mục" description="Chạy schema Supabase để tạo danh mục mặc định." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Slug</th>
                  <th>Mô tả</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <strong>{category.name}</strong>
                    </td>
                    <td>{category.slug}</td>
                    <td>{category.description || "-"}</td>
                    <td>
                      <span className={category.is_active ? "badge ok" : "badge danger"}>
                        {category.is_active ? "Đang dùng" : "Ngừng dùng"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="soft-btn compact" onClick={() => editCategory(category)}>
                          <Edit3 size={16} />
                          Sửa
                        </button>
                        <button className="danger-btn compact" onClick={() => deleteCategory(category.id)}>
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
