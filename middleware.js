// Password gate for the staff area (/staff/).
// Runs on Vercel before the page is served. The browser shows its built-in
// login box; any username works, the password must match the hash below.
// Only a SHA-256 hash is stored here, never the password itself.

export const config = {
  matcher: ['/staff', '/staff/:path*'],
};

const PASSWORD_SHA256 =
  'db7c1e3fd1497f98fd2d4f0f22561e0a7a5905b76c7724cee9c0797e568e9083';

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function unauthorized() {
  return new Response('Staff only. Please sign in.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Alpha Vital Elite IV Staff", charset="UTF-8"',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export default async function middleware(request) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Basic ')) return unauthorized();

  let decoded = '';
  try {
    decoded = atob(header.slice(6));
  } catch {
    return unauthorized();
  }
  const password = decoded.slice(decoded.indexOf(':') + 1);
  if ((await sha256(password)) !== PASSWORD_SHA256) return unauthorized();

  // Correct password: let Vercel serve the page as normal.
  return new Response(null, {
    headers: {
      'x-middleware-next': '1',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
