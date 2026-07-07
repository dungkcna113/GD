"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { supabase, supabaseConfigReady } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigReady) return;

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!supabaseConfigReady) {
      setError("Chưa cấu hình Supabase. Hãy kiểm tra file .env.local rồi tắt app và chạy lại.");
      setLoading(false);
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.replace("/dashboard");
    } catch {
      setError(
        "Không kết nối được Supabase. Hãy kiểm tra mạng, Project URL, Publishable key, rồi tắt app và chạy lại.",
      );
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <Image src="/gd-logo.svg" alt="GD COMPUTER" width={220} height={68} priority />
        <h1>Đăng nhập</h1>
        <p>
          Chỉ tài khoản đã được chủ cửa hàng cấp mới đăng nhập được. Nhân viên không thể tự tạo tài
          khoản từ màn hình này.
        </p>

        {error && <div className="message error">{error}</div>}

        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-row full-row">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@gdcomputer.vn"
              required
            />
          </div>

          <div className="form-row full-row">
            <label>Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              placeholder="Tối thiểu 6 ký tự"
              required
            />
          </div>

          <div className="button-row full-row">
            <button className="primary-btn" disabled={loading}>
              <LogIn size={18} />
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
