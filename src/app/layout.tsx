import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neo4j Builder",
  description: "Build and inspect Neo4j nodes and relationships from a simple web UI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
