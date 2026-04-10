import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700", "800"] });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "GeoTask - Geogis",
  description: "Gerenciamento de Tarefas e Projetos",
  icons: {
    icon: [{ url: "/icon.ico", sizes: "46x46", type: "image/x-icon" }],
    apple: "/icon.ico?v=3",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" translate="no">
      <body
        className={`${inter.variable} ${jakarta.variable} ${jetbrains.variable} font-sans antialiased`}
      >
        {children}
        <div id="tooltip-root" />
      </body>
    </html>
  );
}
