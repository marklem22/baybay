import type { Metadata } from "next";
import "./globals.css";
import { ClientLayout } from "./components/ClientLayout";

export const metadata: Metadata = {
  title: "Room Management",
  description: "Internal operations dashboard for room availability.",
  icons: {
    icon: [
      { url: "/image.jpg", type: "image/jpeg" },
    ],
    shortcut: "/image.jpg",
    apple: "/image.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
