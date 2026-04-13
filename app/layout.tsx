import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "YouTube 熱門蒐集器 | Trending Collector",
  description: "創作者視角的內容靈感引擎 — 自動監控 YouTube 熱門影片，分析標題公式、預測病毒潛力、產出可操作的內容建議",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={`${inter.variable} font-sans antialiased bg-[#0f0f0f] text-[#F9FAFB]`}>{children}</body>
    </html>
  );
}
