"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  ClipboardList,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PackagePlus,
  ReceiptText,
  Search,
  Settings,
  Tags,
  UserRound,
  UsersRound,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { supabase, supabaseConfigReady } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

type AppShellProps = {
  children: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  match?: string[];
};

type NavGroup = {
  title?: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Bán hàng",
    items: [
      { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
      { href: "/orders", label: "Đơn hàng", icon: ClipboardList, match: ["/orders"] },
      { href: "/sales", label: "Tạo đơn hàng", icon: ReceiptText },
      { href: "/repairs", label: "Sửa chữa", icon: Wrench },
    ],
  },
  {
    title: "Sản phẩm",
    items: [
      { href: "/products", label: "Danh sách sản phẩm", icon: Package },
      { href: "/categories", label: "Danh mục sản phẩm", icon: Tags },
    ],
  },
  {
    title: "Quản lý kho",
    items: [
      { href: "/inventory", label: "Tồn kho", icon: Boxes },
      { href: "/stock-in", label: "Nhập hàng", icon: PackagePlus },
      { href: "/suppliers", label: "Nhà cung cấp", icon: FileText },
    ],
  },
  {
    items: [
      { href: "/customers", label: "Khách hàng", icon: UsersRound },
      { href: "/cashbook", label: "Sổ quỹ", icon: Wallet },
      { href: "/reports", label: "Báo cáo", icon: BarChart3 },
    ],
  },
];

function isActive(pathname: string, item: NavItem) {
  const matches = item.match ?? [item.href];
  return matches.some((href) => pathname === href || pathname.startsWith(`${href}/`));
}

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

  const groups = useMemo(() => {
    if (profile?.role !== "owner") return navGroups;
    return [
      ...navGroups,
      {
        title: "Cấu hình",
        items: [{ href: "/settings/users", label: "Tài khoản nhân viên", icon: Settings }],
      },
    ];
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
          <Link href="/dashboard" className="brand-box" onClick={() => setOpen(false)}>
            <Image src="/gd-logo.svg" alt="GD COMPUTER" width={154} height={46} priority />
          </Link>
          <button className="ghost-icon mobile-only" onClick={() => setOpen(false)} aria-label="Đóng menu">
            <X size={20} />
          </button>
        </div>

        <nav className="nav-list">
          {groups.map((group, groupIndex) => (
            <div className="nav-group" key={group.title ?? `group-${groupIndex}`}>
              {group.title && <div className="nav-title">{group.title}</div>}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${active ? "active" : ""}`}
                    onClick={() => setOpen(false)}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <button className="nav-item logout-btn" onClick={signOut}>
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="icon-btn mobile-only" onClick={() => setOpen(true)} aria-label="Mở menu">
            <Menu size={21} />
          </button>

          <div className="global-search">
            <Search size={18} />
            <input placeholder="Tìm kiếm đơn hàng, sản phẩm, khách hàng..." />
          </div>

          <div className="topbar-actions">
            <button className="top-link" type="button">
              <HelpCircle size={18} />
              Trợ giúp
            </button>
            <button className="icon-btn notify-btn" type="button" aria-label="Thông báo">
              <Bell size={18} />
              <span>7</span>
            </button>
            <div className="user-menu">
              <span className="avatar">{profile?.full_name?.slice(0, 2).toUpperCase() || "GD"}</span>
              <div>
                <strong>{profile?.full_name}</strong>
                <small>{profile?.role === "owner" ? "Chủ cửa hàng" : "Nhân viên"}</small>
              </div>
              <ChevronDown size={16} />
            </div>
          </div>
        </header>

        <main className="page-shell">{children}</main>
      </div>

      {open && <button className="backdrop mobile-only" aria-label="Đóng menu" onClick={() => setOpen(false)} />}
    </div>
  );
}
