import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Room Management Dashboard",
  description: "Internal operations dashboard for room availability.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
