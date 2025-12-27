import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { LocaleProvider } from "../context/LocaleContext";
import { IntlProviderWrapper } from "../context/IntlProvider";
import SystemAlert from "./components/SystemAlert";
import { RootLayoutClient } from "./RootLayoutClient";
import { ToastProvider } from "./components/ToastProvider";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Youth App",
  description: "Ungdomsappen 2.0",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body className={`${inter.variable} ${poppins.variable} ${inter.className} overflow-x-hidden max-w-full`}>
        <AuthProvider>
          <LocaleProvider>
            <IntlProviderWrapper>
              <RootLayoutClient>
                <ToastProvider>
                  <SystemAlert />
                  <div className="min-w-0 max-w-full overflow-x-hidden">
                    {children}
                  </div>
                </ToastProvider>
              </RootLayoutClient>
            </IntlProviderWrapper>
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
