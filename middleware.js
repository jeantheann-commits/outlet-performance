// Vercel Edge Middleware: HTTP Basic Auth for the whole site.
// The username and password are read from environment variables set in the
// Vercel dashboard (Project > Settings > Environment Variables):
//   BASIC_AUTH_USER
//   BASIC_AUTH_PASSWORD
// If either is missing, the site stays locked instead of opening up.

export const config = {
  // Run on every path, including index.html and any other static file.
  matcher: "/:path*",
};

const REALM = "Outlet performance";

const enc = new TextEncoder();

// Compare two strings without leaking where they differ. Both sides are hashed
// first so the comparison always runs over 32 bytes, whatever the input length.
async function safeEqual(a, b) {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

function parseBasic(header) {
  if (!header) return null;
  const m = /^Basic\s+(.+)$/i.exec(header.trim());
  if (!m) return null;
  let decoded;
  try {
    const bin = atob(m[1]);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    decoded = new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
  const i = decoded.indexOf(":");
  if (i < 0) return null;
  return { user: decoded.slice(0, i), pass: decoded.slice(i + 1) };
}

function challenge() {
  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export default async function middleware(request) {
  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPass = process.env.BASIC_AUTH_PASSWORD;

  if (!expectedUser || !expectedPass) {
    return new Response(
      "Site is locked: BASIC_AUTH_USER and BASIC_AUTH_PASSWORD are not set for this deployment.",
      { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const creds = parseBasic(request.headers.get("authorization"));
  if (creds) {
    // Evaluate both checks every time so timing does not reveal which one failed.
    const [userOk, passOk] = await Promise.all([
      safeEqual(creds.user, expectedUser),
      safeEqual(creds.pass, expectedPass),
    ]);
    if (userOk && passOk) {
      // Tell Vercel to continue to the requested file. This is the same header
      // that next() from @vercel/functions sets, without needing a dependency.
      return new Response(null, { headers: { "x-middleware-next": "1" } });
    }
  }

  return challenge();
}
