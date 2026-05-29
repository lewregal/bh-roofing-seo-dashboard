import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BH Roofing SEO Dashboard",
  description: "Live search performance and map pack rankings for bhroofingsa.com",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
