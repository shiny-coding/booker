import { NextRequest, NextResponse } from 'next/server';
import { getMetadataManager } from '@/lib/metadata-manager';
import { getShareManager } from '@/lib/share-manager';

// GET - Return embeddable HTML widget for a shared book
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const theme = searchParams.get('theme') || 'auto'; // 'light', 'dark', or 'auto'

    if (!token) {
      return new NextResponse('Missing share token', { status: 400 });
    }

    const shareManager = getShareManager();
    const shareToken = await shareManager.getShareToken(token);

    if (!shareToken) {
      return new NextResponse(generateErrorHTML('Invalid or expired share link'), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const metadataManager = getMetadataManager();
    const book = await metadataManager.getBook(shareToken.bookId);

    if (!book) {
      return new NextResponse(generateErrorHTML('Book no longer exists'), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Get the base URL from the request, respecting reverse proxy headers
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto');

    const host = forwardedHost || request.nextUrl.host;
    const protocol = forwardedProto ? `${forwardedProto}:` : request.nextUrl.protocol;
    const baseUrl = `${protocol}//${host}`;

    const html = generateEmbedHTML({
      token,
      title: book.title,
      author: book.author,
      description: book.description,
      formats: book.formats.map((f) => ({
        format: f.format,
        fileSize: f.fileSize,
      })),
      baseUrl,
      theme,
    });

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error generating embed:', error);
    return new NextResponse(generateErrorHTML('Failed to generate embed'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

interface EmbedData {
  token: string;
  title: string;
  author: string;
  description?: string;
  formats: { format: string; fileSize: number }[];
  baseUrl: string;
  theme: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateEmbedHTML(data: EmbedData): string {
  const { token, title, author, description, formats, baseUrl, theme } = data;

  const formatsHtml = formats
    .map(
      (f) => `
      <div class="format-row">
        <span class="format-badge">${escapeHtml(f.format.toUpperCase())}</span>
        <span class="format-size">${formatFileSize(f.fileSize)}</span>
        <button class="download-btn" onclick="downloadBook('${escapeHtml(token)}', '${escapeHtml(f.format)}', '${escapeHtml(baseUrl)}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download
        </button>
      </div>
    `
    )
    .join('');

  // Theme detection logic
  const themeScript =
    theme === 'auto'
      ? `
    function detectTheme() {
      // Check for color-theme-4 class (custom dark mode indicator)
      if (document.body.classList.contains('color-theme-4') ||
          document.documentElement.classList.contains('color-theme-4') ||
          document.body.classList.contains('dark') ||
          document.documentElement.classList.contains('dark')) {
        document.getElementById('booker-embed').classList.add('dark');
      }
      // Also check parent document if in iframe
      try {
        if (window.parent !== window) {
          const parentBody = window.parent.document.body;
          const parentHtml = window.parent.document.documentElement;
          if (parentBody.classList.contains('color-theme-4') ||
              parentHtml.classList.contains('color-theme-4') ||
              parentBody.classList.contains('dark') ||
              parentHtml.classList.contains('dark')) {
            document.getElementById('booker-embed').classList.add('dark');
          }
        }
      } catch (e) {
        // Cross-origin restriction, can't access parent
      }
    }
    // Run on load and observe for changes
    detectTheme();
    const observer = new MutationObserver(detectTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  `
      : theme === 'dark'
        ? `document.getElementById('booker-embed').classList.add('dark');`
        : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - Download</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.5;
      background: transparent;
    }

    #booker-embed {
      --bg: #ffffff;
      --fg: #0a0a0a;
      --muted: #737373;
      --border: #e5e5e5;
      --card: #ffffff;
      --card-fg: #0a0a0a;
      --badge-bg: #f5f5f5;
      --badge-fg: #0a0a0a;
      --btn-bg: #0a0a0a;
      --btn-fg: #fafafa;
      --btn-hover: #262626;
    }

    #booker-embed.dark {
      --bg: #0a0a0a;
      --fg: #fafafa;
      --muted: #a3a3a3;
      --border: rgba(255,255,255,0.1);
      --card: #171717;
      --card-fg: #fafafa;
      --badge-bg: #262626;
      --badge-fg: #fafafa;
      --btn-bg: #fafafa;
      --btn-fg: #0a0a0a;
      --btn-hover: #e5e5e5;
    }

    .booker-card {
      background: var(--card);
      color: var(--card-fg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      max-width: 400px;
      font-size: 14px;
    }

    .book-icon {
      color: var(--muted);
      margin-bottom: 12px;
      text-align: center;
    }

    .book-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 4px;
      color: var(--fg);
    }

    .book-author {
      color: var(--muted);
      margin-bottom: 16px;
    }

    .book-description {
      color: var(--muted);
      font-size: 13px;
      margin-bottom: 16px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .formats-label {
      font-weight: 500;
      margin-bottom: 8px;
      color: var(--fg);
    }

    .formats-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .format-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg);
    }

    .format-badge {
      background: var(--badge-bg);
      color: var(--badge-fg);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .format-size {
      color: var(--muted);
      font-size: 13px;
      flex: 1;
    }

    .download-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--btn-bg);
      color: var(--btn-fg);
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }

    .download-btn:hover {
      background: var(--btn-hover);
    }

    .download-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .powered-by {
      text-align: center;
      margin-top: 12px;
      font-size: 11px;
      color: var(--muted);
    }

    .powered-by a {
      color: var(--muted);
      text-decoration: none;
    }

    .powered-by a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div id="booker-embed">
    <div class="booker-card">
      <div class="book-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      </div>
      <h2 class="book-title">${escapeHtml(title)}</h2>
      <p class="book-author">by ${escapeHtml(author)}</p>
      ${description ? `<p class="book-description">${escapeHtml(description)}</p>` : ''}
      <div class="formats-label">Download</div>
      <div class="formats-list">
        ${formatsHtml}
      </div>
    </div>
  </div>

  <script>
    async function downloadBook(token, format, baseUrl) {
      const btn = event.target.closest('button');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = 'Downloading...';

      try {
        const response = await fetch(baseUrl + '/api/share/' + token, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format: format })
        });

        if (!response.ok) {
          throw new Error('Download failed');
        }

        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'book.' + format;

        if (contentDisposition) {
          const match = contentDisposition.match(/filename\\*=UTF-8''(.+)/);
          if (match) {
            filename = decodeURIComponent(match[1]);
          }
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err) {
        console.error('Download error:', err);
        alert('Failed to download. Please try again.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }

    ${themeScript}
  </script>
</body>
</html>`;
}

function generateErrorHTML(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100px;
      margin: 0;
      background: transparent;
    }
    .error {
      color: #dc2626;
      text-align: center;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="error">${escapeHtml(message)}</div>
</body>
</html>`;
}
