import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "YouTube 熱門蒐集器 | Trending Collector",
  description: "即時追蹤各地區 YouTube 熱門影片，支援關鍵字搜尋、類別過濾與 Telegram 推播",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
