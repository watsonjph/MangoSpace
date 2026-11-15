import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navigation from "./Navigation";

const display = localFont({ src: "./fonts/bricolage-grotesque.woff2", variable: "--font-display", weight: "400 800" });
const mono = localFont({ src: "./fonts/jetbrains-mono.woff2", variable: "--font-mono", weight: "400 600" });

export const metadata: Metadata = {
  metadataBase: new URL("https://hubas.vercel.app"),
  title: "Hubas",
  description: "The soil, a dam and the rice fields of Cebu and Bohol before El Niño. Measured by NISAR each 12 days, not forecast.",
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body><Navigation />{children}</body>
    </html>
  );
}
