import type { Metadata } from "next";
import { Noto_Serif, Manrope } from "next/font/google";
import "./globals.css";

const notoSerif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const SITE_URL = "https://tinypuertecillo.cl";
const SITE_TITLE = "Tiny House Puertecillo | Arriendo entre el bosque y el mar";
const SITE_DESCRIPTION =
  "Arrienda tu Tiny House de diseño en Puertecillo, Navidad, a 15 min de la playa y el surf. Terraza privada, bosque y mar. Reserva por Airbnb o WhatsApp.";
const OG_IMAGE = `${SITE_URL}/hero/foto_01.jpg`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | Tiny Puertecillo",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "tiny house puertecillo",
    "arriendo tiny house puertecillo",
    "cabañas puertecillo",
    "alojamiento puertecillo",
    "cabañas navidad o'higgins",
    "puertecillo playa",
  ],
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: SITE_URL,
    siteName: "Tiny Puertecillo",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1600,
        height: 1200,
        alt: "Tiny Puertecillo - Cabaña entre el bosque y el mar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  name: "Tiny Puertecillo",
  description: SITE_DESCRIPTION,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Condominio Los Pimientos, Camino a Tumán",
    addressLocality: "Navidad",
    addressRegion: "O'Higgins",
    addressCountry: "CL",
  },
  telephone: "+56979587293",
  url: SITE_URL,
  image: OG_IMAGE,
  sameAs: [
    "https://www.instagram.com/tinypuertecillo.cl/",
    "https://www.airbnb.cl/rooms/1702295511791817167",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${notoSerif.variable} ${manrope.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-surface text-on-surface" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
