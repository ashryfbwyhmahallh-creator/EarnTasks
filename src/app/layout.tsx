import type { Metadata, Viewport } from "next";
import "./globals.css";
import { WhatsAppButton } from "@/components/WhatsAppButton";
export const metadata: Metadata = {
  title: "EarnTasks - Complete offers, earn rewards",
  description: "EarnTasks is a global rewards platform. Complete real offers, earn Points, invite friends, and redeem for gaming rewards or PayPal.",
};
export const viewport: Viewport = { themeColor: "#0a0714", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-brand-bg font-sans text-white antialiased">
        {children}
        <WhatsAppButton />
      </body>
    </html>
  );
}