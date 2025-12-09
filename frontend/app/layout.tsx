import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import SystemAlert from "./components/SystemAlert";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Youth App",
  description: "Ungdomsappen 2.0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${inter.className}`}>
        <AuthProvider>
          <SystemAlert />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}