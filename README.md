# Bookstore - Personal Ebook Library Manager

A Next.js application for managing and converting your ebook collection with a beautiful, modern interface.

## Features

### Core Functionality
- **📚 Book Management**: Upload, organize, and browse your ebook collection
- **🔍 Advanced Search & Filtering**: Search by title, author, or tags; filter by format and tags
- **📱 Mobile-First Design**: Responsive interface optimized for phones and tablets
- **🔐 Secure Authentication**: JWT-based authentication with NextAuth
- **📂 File-Based Storage**: Books stored in organized filesystem structure
- **💾 Metadata Caching**: Fast access with JSON-based metadata cache

### Format Support
- **Supported Formats**: EPUB, PDF, MOBI, AZW, AZW3, TXT
- **Format Conversion**: Convert between formats using Calibre
- **On-Demand Conversion**: Convert books to your preferred format when needed
- **Download Options**: Download any available format with one click

### User Interface
- **Book Grid View**: Clean, card-based layout with cover images (optional)
- **Expandable Details**: Click any book to see full details and available formats
- **Drag & Drop Upload**: Easy book uploads with automatic metadata extraction
- **Real-Time Filtering**: Instant results as you type or select filters
- **Dark Mode**: Full dark mode support via Tailwind CSS

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Authentication**: NextAuth.js v5 (JWT)
- **Format Conversion**: Calibre (via calibre-node)
- **File Uploads**: react-dropzone

## Prerequisites

### Required
- Node.js 20.11+ (for the application)
- npm or yarn

### Optional (for format conversion)
- [Calibre](https://calibre-ebook.com/download) - Required for ebook format conversion

## Installation

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
Copy the example env file:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and update:
```env
NEXTAUTH_SECRET=your-secret-key-here
# Generate a secret with: openssl rand -base64 32
```

### 3. Install Calibre (optional, for conversion)
Download and install Calibre from https://calibre-ebook.com/download

Make sure `ebook-convert` is in your system PATH, or set `CALIBRE_PATH` in `.env.local`.

### 4. Run the development server
```bash
npm run dev
```

Visit http://localhost:3000

## Usage

### First Time Setup

1. **Login**: Use the default credentials:
   - Email: `admin@bookstore.local`
   - Password: `admin123`

2. **Add Books**: You have two options:
   - **Upload**: Click "Upload Book" to add files via drag & drop
   - **Scan**: Click "Scan Library" to detect books in `library/books/` folder

### File System Structure

Books are stored in the following structure:
```
library/
├── metadata.json           # Book metadata cache
└── books/
    ├── the-great-gatsby/
    │   ├── the-great-gatsby.epub  (original)
    │   ├── the-great-gatsby.pdf   (converted)
    │   └── the-great-gatsby.azw3  (converted)
    └── 1984-george-orwell/
        ├── 1984-george-orwell.pdf  (original)
        └── 1984-george-orwell.epub (converted)

public/
└── covers/
    ├── the-great-gatsby.jpg
    └── 1984-george-orwell.jpg
```

### Adding Books Manually

1. Create a folder in `library/books/` with the format: `book-title` or `book-title-author-name`
2. Place your ebook file(s) in that folder
3. (Optional) Add a cover image to `public/covers/` with the same folder name
4. Click "Scan Library" to detect the new books

### Converting Formats

1. Click on any book card to open details
2. Find the format you want to convert from
3. Click the "Convert" dropdown
4. Select the target format
5. Wait for conversion to complete (usually 10-30 seconds)

**Conversion Matrix**:
- EPUB → PDF, AZW3, MOBI, TXT
- PDF → EPUB, TXT
- MOBI/AZW → EPUB, PDF, AZW3, TXT
- TXT → EPUB, PDF

### Downloading Books

1. Click on a book card to open details
2. Click "Download" next to any format
3. The file will be downloaded to your device

## API Endpoints

### Books
- `GET /api/books` - List books with optional filters
- `POST /api/books/upload` - Upload a new book
- `POST /api/books/scan` - Scan filesystem for books
- `GET /api/books/download` - Download a book file
- `POST /api/books/convert` - Convert book format
- `GET /api/books/metadata` - Get all tags and authors

### Authentication
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXTAUTH_URL` | Application URL | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Secret for JWT signing | Required |
| `LIBRARY_PATH` | Path to library folder | `./library` |
| `BOOKS_PATH` | Path to books folder | `./library/books` |
| `COVERS_PATH` | Path to covers folder | `./public/covers` |
| `CALIBRE_PATH` | Path to ebook-convert binary | System PATH |

### User Management

The default implementation uses in-memory user storage. To add users:

1. Edit `auth.ts`
2. Add users to the `users` Map:
```typescript
users.set('user@example.com', {
  id: '2',
  email: 'user@example.com',
  password: 'password123', // Hash in production!
  name: 'User Name',
});
```

For production, implement proper password hashing (bcrypt, argon2) and persistent storage.

## Development

### Building for Production
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## Project Structure

```
bookstore/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   └── books/         # Book management endpoints
│   ├── library/           # Main library page
│   ├── login/             # Login page
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   ├── book-card.tsx      # Book card component
│   ├── filter-panel.tsx   # Filtering sidebar
│   └── upload-dialog.tsx  # Upload modal
├── lib/                   # Utility functions
│   ├── types.ts           # TypeScript types
│   ├── metadata-manager.ts # Metadata cache manager
│   ├── book-scanner.ts    # Filesystem scanner
│   └── book-converter.ts  # Format conversion
├── library/               # Book storage (gitignored)
│   ├── metadata.json      # Book metadata
│   └── books/             # Book files
├── public/                # Static assets
│   └── covers/            # Book cover images
└── auth.ts                # NextAuth configuration
```

## Troubleshooting

### Calibre Not Found
- Ensure Calibre is installed
- Add Calibre's bin directory to your system PATH
- Or set `CALIBRE_PATH` in `.env.local`

### Books Not Showing After Scan
- Check folder structure matches: `library/books/book-name/file.epub`
- Ensure files have supported extensions
- Check console for errors

### Upload Fails
- Check file size (default max: 50MB)
- Verify file format is supported
- Ensure write permissions on `library/books/` folder

### Conversion Fails
- Verify Calibre is installed and accessible
- Check console/network tab for error details
- Some formats may have limited conversion options

## Roadmap

### Planned Features
- [ ] Cover image extraction from ebook files
- [ ] Advanced metadata editing
- [ ] Collections/shelves organization
- [ ] Reading progress tracking
- [ ] "Send to Kindle" email integration
- [ ] Cloud storage integration (Dropbox, Google Drive)
- [ ] Multiple user accounts with MongoDB
- [ ] Reading statistics and analytics
- [ ] Book recommendations

## Contributing

This is a personal project, but suggestions and bug reports are welcome!

## License

MIT License - feel free to use this for your personal library!

## Credits

- Built with [Next.js](https://nextjs.org/)
- UI components by [shadcn/ui](https://ui.shadcn.com/)
- Ebook conversion powered by [Calibre](https://calibre-ebook.com/)
- Authentication via [NextAuth.js](https://next-auth.js.org/)

---

**Happy Reading! 📚**
