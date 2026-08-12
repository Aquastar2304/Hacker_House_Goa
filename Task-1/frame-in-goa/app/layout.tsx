import type { Metadata, Viewport } from "next";
import "./globals.css";

const title = "Frame in Goa — HH Goa 2026 Frame & Builder ID Generator";
const description =
  "Upload a photo, get a Hacker House Goa 2026 profile frame or builder ID in seconds. Download it, share it to X with #FrameInGoa.";

export const metadata: Metadata = {
  title,
  description,
  applicationName: "Frame in Goa",
  openGraph: {
    title,
    description,
    type: "website",
    siteName: "Frame in Goa",
  },
  twitter: { card: "summary_large_image", title, description },
  icons: { icon: "/brand/goa.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0B6839",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
