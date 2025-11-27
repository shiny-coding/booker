# Booker

A self-hosted ebook library manager with format conversion, sharing, and embedding capabilities.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8)

## Features

- **Library Management** - Upload, organize, and manage your ebook collection
- **Format Conversion** - Convert between EPUB, PDF, MOBI, AZW3, TXT, DOCX using Calibre
- **Public Sharing** - Generate shareable links for books that anyone can access
- **Embeddable Widgets** - Embed book download cards on other websites via iframe
- **Dark Mode** - Full dark/light theme support with toggle
- **Responsive UI** - Works on desktop and mobile

## Quick Start

### Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/booker.git
cd booker

# Copy environment file
cp .env.example .env

# Generate and add secret key
openssl rand -base64 32
# Edit .env and set NEXTAUTH_SECRET to the generated value

# Start everything
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000) and register an account.

### Development Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local

# Generate a secret key and add to .env.local
openssl rand -base64 32

# Start the Calibre conversion service
docker compose up -d calibre

# Start the development server
npm run dev
```

## Configuration

### Environment Variables

For Docker deployment (`.env`):

```env
# Required: Generate with `openssl rand -base64 32`
NEXTAUTH_SECRET=your-generated-secret

# App URL
NEXTAUTH_URL=http://localhost:3000

# Host port (default: 3000)
APP_PORT=3000

# Data storage path on host (default: ./data)
DATA_PATH=./data
```

For development (`.env.local`):

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-generated-secret

# Library paths
LIBRARY_PATH=./library
BOOKS_PATH=./library/books

# Calibre service
CALIBRE_MODE=remote
CALIBRE_API_URL=http://localhost:8081
```

### Change Port

To run on a different port, set `APP_PORT` in `.env`:

```env
APP_PORT=8080
NEXTAUTH_URL=http://localhost:8080
```

## Usage

### Managing Books

- **Upload** - Click "Upload" to add ebooks (EPUB, PDF, MOBI, AZW, AZW3, TXT, DOCX)
- **Convert** - Check a format checkbox to convert to that format
- **Download** - Click format label to download
- **Delete** - Uncheck a format checkbox to delete it

### Sharing Books

1. Click **Share** on any book card
2. Link is copied to clipboard automatically
3. Anyone with the link can download any available format

### Embedding

After sharing a book, click **Embed** to copy iframe code for your website:

```html
<iframe
  src="https://your-booker-instance/api/embed/TOKEN"
  width="420"
  height="336"
  frameborder="0"
  style="border-radius: 12px; max-width: 100%;">
</iframe>
```

The embed widget auto-detects dark mode via `dark` or `color-theme-4` class on the parent page. Force a theme with `?theme=dark` or `?theme=light`.

## Project Structure

```
booker/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   ├── books/         # Book management
│   │   ├── embed/         # Embed widget
│   │   └── share/         # Public sharing
│   ├── library/           # Main library page
│   └── share/             # Public share page
├── components/            # React components
├── lib/                   # Utilities
│   ├── book-converter.ts  # Calibre integration
│   ├── metadata-manager.ts
│   ├── share-manager.ts
│   └── user-store.ts
├── data/                  # Data storage (Docker volume, gitignored)
│   ├── books/            # Uploaded ebooks
│   ├── covers/           # Book cover images
│   ├── metadata.json     # Book metadata
│   ├── shares.json       # Share tokens
│   └── users.json        # User accounts
├── calibre-service.py    # Calibre HTTP API
└── Dockerfile.calibre    # Calibre container
```

## API Reference

### Books

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/books` | GET | List all books |
| `/api/books/upload` | POST | Upload a book |
| `/api/books/[id]` | DELETE | Delete a book |
| `/api/books/download` | GET | Download a format |
| `/api/books/convert` | POST | Convert format |
| `/api/books/format` | DELETE | Delete a format |

### Sharing

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/books/[id]/share` | POST | Create share link |
| `/api/share/[token]` | GET | Get shared book info |
| `/api/share/[token]` | POST | Download shared format |
| `/api/embed/[token]` | GET | Get embeddable HTML widget |

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Components**: shadcn/ui
- **Authentication**: NextAuth.js v5
- **Conversion**: Calibre (Docker)

## Deployment

### Docker Compose (Recommended)

```bash
# Production deployment
docker compose up -d

# View logs
docker compose logs -f

# Rebuild after code changes
docker compose build && docker compose up -d
```

### Manual Deployment

```bash
# Build the app
npm run build

# Start Calibre service
docker compose up -d calibre

# Start the app
npm start
```

## License

MIT

## Acknowledgments

- [Calibre](https://calibre-ebook.com/) - Ebook conversion
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Next.js](https://nextjs.org/) - Framework
