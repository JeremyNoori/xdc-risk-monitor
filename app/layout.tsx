import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "XDC Exchange Risk Monitor",
  description:
    "Dashboard monitoring XDC exchange reserves and coverage ratios across top trading venues.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <div className="container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h1>
                <a href="/" style={{ color: "inherit", textDecoration: "none" }}>
                  XDC Exchange Risk Monitor
                </a>
                <span className="tag">MVP</span>
              </h1>
              <a
                href="/settings"
                style={{
                  fontSize: "0.85rem",
                  color: "#8888a0",
                  textDecoration: "none",
                }}
              >
                Settings
              </a>
            </div>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
