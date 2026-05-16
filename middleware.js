import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const clerkRequestMiddleware = hasUsableClerkPublishableKey(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  ? clerkMiddleware()
  : null;

export default function middleware(request, event) {
  if (!clerkRequestMiddleware) return NextResponse.next();
  return clerkRequestMiddleware(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ico|ttf|woff2?|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)"
  ]
};

function hasUsableClerkPublishableKey(value) {
  const key = String(value || "");
  return /^pk_(test|live)_[A-Za-z0-9_-]{24,}/.test(key);
}
