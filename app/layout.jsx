import "./globals.css";

export const metadata = {
  title: "Aculeus | Operator workspace",
  description: "Aculeus is an invite-only public-records intelligence system for source-backed investigations.",
  icons: {
    icon: "/favicon.svg"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
