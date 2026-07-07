"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/lib/supabase";
import type { Profile, Role } from "@/lib/types";

export default function UsersPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setCurrentUserId(user.id);

    const { data: me } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    const profile = me as Profile | null;
    setCurrentRole(profile?.role ?? null);

    const { data, error: loadError } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (loadError) setError(loadError.message);
    setProfiles((data as Profile[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function updateProfile(id: string, patch: Partial<Profile>) {
    setMessage(null);
    setError(null);

    if (id === currentUserId && patch.is_active === false) {
      setError("Không nên tự khóa tài khoản đang đăng nhập.");
      return;
    }

    const { error: updateError } = await supabase.from("profiles").update(patch).eq("id", id);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Đã cập nhật tài khoản.");
    await loadUsers();
  }

  return (
    <>
      <PageHeader title="Tài khoản" description="Chủ cửa hàng quản lý quyền nhân viên và trạng thái đăng nhập.">
        <ShieldCheck size={28} color="#0f766e" />
      </PageHeader>

      {message && <div className="message success">{message}</div>}
      {error && <div className="message error">{error}</div>}

      <section className="panel">
        {loading ? (
          <div className="message">Đang tải tài khoản...</div>
        ) : currentRole !== "owner" ? (
          <EmptyState title="Chỉ chủ cửa hàng được xem mục này" description="Liên hệ tài khoản chủ để đổi quyền." />
        ) : profiles.length === 0 ? (
          <EmptyState title="Chưa có tài khoản" description="Tạo tài khoản mới trong Supabase Auth, sau đó quay lại đây để phân quyền." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Điện thoại</th>
                  <th>Quyền</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id}>
                    <td>
                      <strong>{profile.full_name}</strong>
                    </td>
                    <td>{profile.email || "-"}</td>
                    <td>{profile.phone || "-"}</td>
                    <td>
                      <select
                        value={profile.role}
                        onChange={(event) => updateProfile(profile.id, { role: event.target.value as Role })}
                        disabled={profile.id === currentUserId}
                      >
                        <option value="owner">Chủ cửa hàng</option>
                        <option value="staff">Nhân viên</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={profile.is_active ? "active" : "locked"}
                        onChange={(event) => updateProfile(profile.id, { is_active: event.target.value === "active" })}
                        disabled={profile.id === currentUserId}
                      >
                        <option value="active">Đang hoạt động</option>
                        <option value="locked">Đã khóa</option>
                      </select>
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
