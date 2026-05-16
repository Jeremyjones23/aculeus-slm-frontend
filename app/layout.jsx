import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata = {
  title: "Aculeus | Operator workspace",
  description: "Aculeus is an invite-only public-records intelligence system for source-backed investigations.",
  icons: {
    icon: "/favicon.svg"
  }
};

export default function RootLayout({ children }) {
  const shell = (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
  if (!hasUsableClerkPublishableKey(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)) return shell;
  return (
    <ClerkProvider>
      {shell}
    </ClerkProvider>
  );
}

function hasUsableClerkPublishableKey(value) {
  const key = String(value || "");
  return /^pk_(test|live)_[A-Za-z0-9_-]{24,}/.test(key);
}
