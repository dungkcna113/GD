"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, BarChart3, Boxes, Banknote, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { dateText, money, numberText } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { BestSeller, LowStock, ReportRow } from "@/lib/types";

export default function ReportsPage() {
  const [daily, setDaily] = useState<ReportRow[]>([]);
  const [monthly, setMonthly] = useState<ReportRow[]>([]);
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([]);
  const [lowStock, setLowStock] = useState<LowStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReports() {
      const [dailyRes, monthlyRes, bestRes, stockRes] = await Promise.all([
        supabase.from("v_daily_revenue").select("*").limit(31),
        supabase.from("v_monthly_revenue").select("*").limit(12),
        supabase.from("v_best_sellers").select("*").limit(20),
        supabase.from("v_low_stock").select("*").limit(30),
      ]);

      const firstError = dailyRes.error ?? monthlyRes.error ?? bestRes.error ?? stockRes.error;
      if (firstError) setError(firstError.message);

      setDaily((dailyRes.data as ReportRow[]) ?? []);
      setMonthly((monthlyRes.data as ReportRow[]) ?? []);
      setBestSellers((bestRes.data as BestSeller[]) ?? []);
      setLowStock((stockRes.data as LowStock[]) ?? []);
      setLoading(false);
    }

    loadReports();
  }, []);

  const today = daily[0];
  const month = monthly[0];

  return (
    <>
      <PageHeader
        title="Báo cáo"
        description="Theo dõi doanh thu, lợi nhuận, sản phẩm bán chạy và tồn kho thấp."
      />

      {error && <div className="message error">{error}</div>}

      <section className="grid-4">
        <StatCard label="Doanh thu gần nhất" value={money(today?.revenue)} tone="red" icon={<Banknote size={21} />} />
        <StatCard label="Lợi nhuận gần nhất" value={money(today?.profit)} tone="green" icon={<TrendingUp size={21} />} />
        <StatCard label="Doanh thu tháng" value={money(month?.revenue)} tone="gray" icon={<BarChart3 size={21} />} />
        <StatCard label="Tồn kho thấp" value={numberText(lowStock.length)} tone="amber" icon={<AlertTriangle size={21} />} />
      </section>

      <section className="grid-2" style={{ marginTop: 14 }}>
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Doanh thu theo ngày</h2>
              <p>31 ngày gần nhất có phát sinh đơn hàng.</p>
            </div>
          </div>

          {loading ? (
            <div className="message">Đang tải báo cáo...</div>
          ) : daily.length === 0 ? (
            <EmptyState title="Chưa có dữ liệu" description="Báo cáo sẽ xuất hiện sau khi có đơn hàng." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Đơn</th>
                    <th>Doanh thu</th>
                    <th>Lợi nhuận</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map((row) => (
                    <tr key={row.revenue_date}>
                      <td>{dateText(row.revenue_date)}</td>
                      <td>{numberText(row.order_count)}</td>
                      <td>{money(row.revenue)}</td>
                      <td>{money(row.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Doanh thu theo tháng</h2>
              <p>12 tháng gần nhất có phát sinh đơn hàng.</p>
            </div>
          </div>

          {loading ? (
            <div className="message">Đang tải báo cáo...</div>
          ) : monthly.length === 0 ? (
            <EmptyState title="Chưa có dữ liệu" description="Báo cáo tháng sẽ có sau khi bán hàng." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tháng</th>
                    <th>Đơn</th>
                    <th>Doanh thu</th>
                    <th>Lợi nhuận</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((row) => (
                    <tr key={row.revenue_month}>
                      <td>{dateText(row.revenue_month)}</td>
                      <td>{numberText(row.order_count)}</td>
                      <td>{money(row.revenue)}</td>
                      <td>{money(row.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="grid-2" style={{ marginTop: 14 }}>
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Sản phẩm bán chạy</h2>
              <p>Xếp theo số lượng đã bán.</p>
            </div>
          </div>

          {loading ? (
            <div className="message">Đang tải dữ liệu...</div>
          ) : bestSellers.length === 0 ? (
            <EmptyState title="Chưa có sản phẩm bán chạy" description="Danh sách sẽ có sau khi phát sinh đơn." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Đã bán</th>
                    <th>Doanh thu</th>
                    <th>Lợi nhuận</th>
                  </tr>
                </thead>
                <tbody>
                  {bestSellers.map((item) => (
                    <tr key={`${item.product_id}-${item.product_sku}`}>
                      <td>
                        <strong>{item.product_name}</strong>
                        <br />
                        <span className="muted">{item.product_sku}</span>
                      </td>
                      <td>{numberText(item.sold_quantity)}</td>
                      <td>{money(item.revenue)}</td>
                      <td>{money(item.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Tồn kho thấp</h2>
              <p>Sản phẩm cần nhập thêm.</p>
            </div>
            <Boxes size={22} color="#b7791f" />
          </div>

          {loading ? (
            <div className="message">Đang tải dữ liệu...</div>
          ) : lowStock.length === 0 ? (
            <EmptyState title="Kho đang ổn" description="Không có sản phẩm dưới ngưỡng cảnh báo." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Sản phẩm</th>
                    <th>Tồn</th>
                    <th>Ngưỡng</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((item) => (
                    <tr key={item.id}>
                      <td>{item.sku}</td>
                      <td>{item.name}</td>
                      <td>
                        <span className="badge warn">{numberText(item.stock_quantity)}</span>
                      </td>
                      <td>{numberText(item.low_stock_threshold)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
