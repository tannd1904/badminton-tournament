import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "BadmintonPro — Nền Tảng Quản Lý Giải Đấu Cầu Lông Trực Tuyến",
  description:
    "Hệ thống quản lý giải đấu cầu lông chuyên nghiệp: bốc thăm chia bảng, xếp lịch thông minh, chấm điểm BWF realtime và bảng điểm trực tiếp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="flex flex-col min-h-screen">
        <QueryProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </QueryProvider>
      </body>
    </html>
  );
}

