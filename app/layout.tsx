import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dare - The Digital Council",
  description: "Voice conversations for underserved communities. Works on any phone, any connection.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}