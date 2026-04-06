export const metadata = {
  title: "DevGhost",
  description: "AI-powered GitHub repo analyzer",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Inter, Arial, sans-serif" }}>{children}</body>
    </html>
  );
}
