import type { NextConfig } from "next";

// Sentry runtime instrumentation lives in src/instrumentation.ts +
// sentry.{client,server,edge}.config.ts and works without withSentryConfig.
// The build-time wrapper is intentionally omitted: in @sentry/nextjs 9 + Next 15
// it auto-generates a pages-router _error.js whose <Html> import breaks
// app-router SSG. Re-enable when we need source-map upload in production.

// CSP — locks the page down to first-party + the few external origins we
// actually use (Supabase, optional Sentry). 'unsafe-inline'/'unsafe-eval'
// stay on script-src for now because Next 15 ships inline runtime chunks
// without nonces in App Router; a nonce migration is a separate piece of
// work and is documented as a follow-up.
const supabaseOrigin = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
})();
const sentryIngest = "https://*.sentry.io";

const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob:`,
  `font-src 'self' data:`,
  `connect-src 'self' ${supabaseOrigin} ${sentryIngest}`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
