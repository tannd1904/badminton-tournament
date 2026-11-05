"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trophy, AlertCircle, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res: any = await apiClient.post("/auth/login", { email, password });
      if (res?.data) {
        const { user, accessToken, refreshToken } = res.data;
        login(user, accessToken, refreshToken);
        router.push(user.role === "SUPER_ADMIN" ? "/admin" : "/");
      }
    } catch (err: any) {
      setError(err?.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <Trophy className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Đăng Nhập BadmintonPro
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Truy cập tài khoản VĐV, Ban Tổ Chức hoặc Trọng Tài
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3.5 text-sm font-medium text-rose-700 border border-rose-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 sm:text-sm"
              placeholder="ten@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Mật khẩu</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 sm:text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-brand-600 py-2.5 px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 disabled:opacity-50 transition"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              "Đăng Nhập"
            )}
          </button>

          <div className="text-center text-sm text-slate-500">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-500">
              Đăng ký ngay
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

