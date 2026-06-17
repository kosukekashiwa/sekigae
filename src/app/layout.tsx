import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "700"],
  preload: false,
  variable: "--font-noto-sans-jp",
  display: "swap",
  fallback: ["Hiragino Sans", "Hiragino Kaku Gothic ProN", "sans-serif"],
});

const siteUrl = "https://sekigae-three.vercel.app";

export const metadata: Metadata = {
  title: "席替えアプリ | 無料でかんたん座席決め",
  description:
    "クラスの座席をランダムに決める無料の席替えアプリ。生徒登録・座席設定・指定席にも対応。PCブラウザで今すぐ使えます。",
  keywords: [
    "席替え",
    "座席決め",
    "ランダム",
    "クラス",
    "教室",
    "無料",
    "先生",
  ],
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "席替えアプリ | 無料でかんたん座席決め",
    description:
      "クラスの座席をランダムに決める無料ツール。生徒登録・座席設定・指定席に対応。",
    locale: "ja_JP",
    type: "website",
    url: siteUrl,
  },
  twitter: {
    card: "summary",
    title: "席替えアプリ | 無料でかんたん座席決め",
    description:
      "クラスの座席をランダムに決める無料ツール。生徒登録・座席設定・指定席に対応。",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "席替えアプリ",
  description: "クラスの座席をランダムに決める無料ツール",
  url: siteUrl,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  inLanguage: "ja",
  offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSansJp.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
