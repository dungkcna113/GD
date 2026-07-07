"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Boxes,
  Cpu,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PackagePlus,
  ReceiptText,
  Settings,
  ShoppingCart,
  Tags,
  Truck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { supabase, supabaseConfigReady } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

type AppShellProps = {
  children: ReactNode;
};

const baseNav = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/sales", label: "Bán hàng", icon: ShoppingCart },
  { href: "/stock-in", label: "Nhập kho", icon: PackagePlus },
  { href: "/products", label: "Sản phẩm", icon: Cpu },
  { href: "/categories", label: "Danh mục", icon: Tags },
  { href: "/customers", label: "Khách hàng", icon: UsersRound },
  { href: "/suppliers", label: "Nhà cung cấp", icon: Truck },
  { href: "/reports", label: "Báo cáo", icon: BarChart3 },
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      if (!supabaseConfigReady) {
        router.replace("/login");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,full_name,phone,role,is_active")
        .eq("id", session.user.id)
        .single();

      if (!mounted) return;

      if (error || !data?.is_active) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setProfile(data as Profile);
      setLoading(false);
    }

    loadSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [router]);

  const navItems = useMemo(() => {
    if (profile?.role === "owner") {
      return [...baseNav, { href: "/settings/users", label: "Tài khoản", icon: Settings }];
    }
    return baseNav;
  }, [profile?.role]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="boot-screen">
        <Image src="/gd-logo.svg" alt="GD COMPUTER" width={220} height={68} priority />
        <p>Đang mở phần mềm bán hàng...</p>
      </div>
    );
  }

  return (
    <div className="app-frame">
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="sidebar-head">
          <Image src="/gd-logo.svg" alt="GD COMPUTER" width={190} height={58} priority />
          <button className="icon-btn mobile-only" onClick={() => setOpen(false)} aria-label="Đóng menu">
            <X size={20} />
          </button>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${active ? "active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="user-chip">
            <UserRound size={18} />
            <div>
              <strong>{profile?.full_name}</strong>
              <span>{profile?.role === "owner" ? "Chủ cửa hàng" : "Nhân viên"}</span>
            </div>
          </div>
          <button className="soft-btn full" onClick={signOut}>
            <LogOut size={18} />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="icon-btn mobile-only" onClick={() => setOpen(true)} aria-label="Mở menu">
            <Menu size={21} />
          </button>
          <div>
            <strong>GD COMPUTER</strong>
            <span>Quản lý bán hàng linh kiện máy tính</span>
          </div>
          <Link href="/sales" className="primary-btn compact">
            <ReceiptText size={18} />
            Tạo đơn
          </Link>
        </header>

        <main className="page-shell">{children}</main>
      </div>

      {open && <button className="backdrop mobile-only" aria-label="Đóng menu" onClick={() => setOpen(false)} />}
    </div>
  );
}
