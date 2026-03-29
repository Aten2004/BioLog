import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "./components/Navigation";
import GlobalTimerAlert from "./components/GlobalTimerAlert";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BioLog",
  description: "Advanced biometric and fitness tracker",
  icons: {
    icon: "/icon.svg", 
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navigation />
        <GlobalTimerAlert />
        <main className="pt-20 pb-24 sm:pb-8 min-h-screen max-w-md mx-auto px-4 sm:px-6">
          {children}
        </main>
      </body>
    </html>
  );
}