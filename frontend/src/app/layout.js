import { Geist, Geist_Mono } from "next/font/google";
import { RouteTransitionProvider } from "@/components/app/route-transition-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "CRM",
  description: "CRM authentication and company management",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <RouteTransitionProvider>{children}</RouteTransitionProvider>
      </body>
    </html>
  );
}
