import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";
import localFont from 'next/font/local';
import "./globals.css";

const soriaFont = localFont({
  src: "../public/soria-font.ttf",
  variable: "--font-soria",
});

const vercettiFont = localFont({
  src: "../public/Vercetti-Regular.woff",
  variable: "--font-vercetti",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://SquiddyScripts.github.io/'),
  title: "Confessions — by Amaan S. Khan",
  description: "A light fall jacket in maroon and black. Reserve a size or join the waitlist. 100 jackets in production.",
  keywords: "Confessions, Amaan S. Khan, jacket, maroon, black, embroidery, suede",
  authors: [{ name: "Amaan Khan" }],
  creator: "Amaan Khan",
  publisher: "Amaan Khan",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: "Confessions — by Amaan S. Khan",
    description: "A light fall jacket in maroon and black. Reserve a size or join the waitlist.",
    siteName: "Confessions",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Confessions — by Amaan S. Khan",
    description: "A light fall jacket in maroon and black. Reserve a size or join the waitlist.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0908",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overscroll-y-none">
      <body
        className={`${soriaFont.variable} ${vercettiFont.variable} font-sans antialiased`}
      >
        {children}
      </body>
      <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID || ''}/>
    </html>
  );
}
