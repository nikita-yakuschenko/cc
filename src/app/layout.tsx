import type { Metadata } from "next";
import { Manrope, IBM_Plex_Mono } from "next/font/google";
import { AppToaster } from "@/components/ui/app-toaster";
import "./globals.css";
import { APP_NAME } from "@/lib/constants";

const sans = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500"],
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: "Управляемые цифровые переходы. Ссылки, UTM и аналитика.",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${sans.variable} ${mono.variable} antialiased`}>
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
