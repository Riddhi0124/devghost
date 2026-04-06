export const metadata = {
  title: "DevGhost",
  description: "AI-powered GitHub repo analyzer",
};

import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
