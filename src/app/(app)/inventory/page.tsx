"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, ImageIcon, ListFilter, PackagePlus, Upload } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { numberText } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/lib/types";

const tabs = [
  { key: "all", label: "Tất cả" },
  { key: "in_stock", label: "Còn hàng" },
  { key: "out_stock", label: "Hết hàng" },
  { key: "low_stock", label: "Tồn kho thấp" },
];

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !keyword ||
        [product.sku, product.barcode, product.name, product.category_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "in_stock" && product.stock_quantity > 0) ||
        (activeTab === "out_stock" && product.stock_quantity === 0) ||
        (activeTab === "low_stock" && product.stock_quantity <= product.low_stock_threshold);
      return matchesSearch && matchesTab;
    });
  }, [products, activeTab, search]);

  useEffect(() => {
    async function loadProducts() {
      const { data, error: loadError } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("is_active", true)
        .order("name");

      if (loadError) setError(loadError.message);
      const mapped = ((data ?? []) as Array<Product & { categories?: { name: string } | null }>).map((item) => ({
        ...item,
        category_name: item.categories?.name ?? null,
      }));
      setProducts(mapped);
      setLoading(false);
    }

    loadProducts();
  }, []);

  return (
    <>
      <PageHeader title="Quản lý kho" description="Theo dõi tồn kho hiện tại, hàng còn bán và sản phẩm cần nhập thêm.">
        <button className="soft-btn" type="button">
          <Download size={17} />
          Xuất file
        </button>
        <Link href="/stock-in" className="primary-btn">
          <PackagePlus size={17} />
          Nhập hàng
        </Link>
      </PageHeader>

      {error && <div className="message error">{error}</div>}

      <section className="table-panel">
        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="filter-row">
          <input
            className="search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm kiếm theo mã SKU, tên sản phẩm, barcode"
          />
          <div className="filters">
            <button className="soft-btn compact" type="button">
              <ListFilter size={16} />
              Bộ lọc khác
            </button>
            <button className="soft-btn compact" type="button">
              <Upload size={16} />
              Nhập file
            </button>
          </div>
        </div>

        {loading ? (
          <div className="message" style={{ margin: 20 }}>
            Đang tải tồn kho...
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState title="Chưa có sản phẩm trong kho" description="Thêm sản phẩm hoặc nhập hàng để bắt đầu quản lý tồn kho." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>SKU</th>
                  <th>Barcode</th>
                  <th>Đơn vị</th>
                  <th>Tồn kho</th>
                  <th>Có thể bán</th>
                  <th>Không thể bán</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const low = product.stock_quantity <= product.low_stock_threshold;
                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="product-cell">
                          <div className="product-thumb">
                            {product.image_url ? <img src={product.image_url} alt={product.name} /> : <ImageIcon size={18} />}
                          </div>
                          <div className="product-meta">
                            <Link className="link-blue" href="/products">
                              {product.name}
                            </Link>
                            <span>{product.category_name || "Chưa phân loại"}</span>
                          </div>
                        </div>
                      </td>
                      <td>{product.sku}</td>
                      <td>{product.barcode || "-"}</td>
                      <td>{product.unit || "cái"}</td>
                      <td>{numberText(product.stock_quantity)}</td>
                      <td>{numberText(Math.max(product.stock_quantity, 0))}</td>
                      <td>0</td>
                      <td>
                        <span className={product.stock_quantity === 0 ? "badge danger" : low ? "badge warn" : "badge ok"}>
                          {product.stock_quantity === 0 ? "Hết hàng" : low ? "Sắp hết" : "Còn hàng"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
