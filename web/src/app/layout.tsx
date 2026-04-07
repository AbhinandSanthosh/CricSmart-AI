import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "CricEye AI",
  description: "AI-powered cricket training platform",
  // Next.js 15 picks up app/favicon.ico, app/icon.png and app/apple-icon.png
  // automatically. We add explicit metadata for OG/social previews.
  openGraph: {
    title: "CricEye AI",
    description: "Detect. Analyse. Improve. — AI-powered cricket training platform",
    images: ["/criceye-logo.png"],
  },
  twitter: {
    card: "summary",
    title: "CricEye AI",
    description: "Detect. Analyse. Improve. — AI-powered cricket training platform",
    images: ["/criceye-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
