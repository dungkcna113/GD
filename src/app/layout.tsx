import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GD COMPUTER - Quản lý bán hàng",
  description: "Web app quản lý cửa hàng linh kiện máy tính GD COMPUTER",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
