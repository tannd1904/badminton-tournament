"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Trophy, Radio, LogOut, User as UserIcon } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

export function Navbar() {
  const { user, isAuthenticated, logout, loadFromStorage } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-slate-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
              <Trophy className="h-5 w-5" />
            </div>
            <span className="text-xl tracking-tight">BadmintonPro</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link href="/" className="hover:text-brand-600 transition">
              Khám Phá Giải
            </Link>
            <Link href="/live" className="flex items-center gap-1.5 text-rose-600 font-semibold hover:text-rose-700 transition">
              <Radio className="h-4 w-4 animate-pulse" />
              Live Scores
            </Link>
            <Link href="/organizer" className="hover:text-brand-600 transition">
              Ban Tổ Chức
            </Link>
            <Link href="/umpire" className="hover:text-brand-600 transition">
              Trọng Tài
            </Link>
            {user?.role === "SUPER_ADMIN" && (
              <Link href="/admin" className="text-amber-600 font-semibold hover:text-amber-700 transition">
                Quản Trị Hệ Thống
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="font-semibold text-slate-900 leading-none">{user.fullName}</span>
                  <span className="text-xs text-slate-500 mt-0.5">{user.role}</span>
                </div>
              </div>
              <button
                onClick={logout}
                title="Đăng xuất"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-rose-600 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
              >
                Đăng Nhập
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition"
              >
                Tạo Tài Khoản
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
