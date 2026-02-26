# High-Signal Aggregator

<p align="center">
  <img src="https://img.shields.io/github/stars/yourusername/high_quality_info" alt="stars">
  <img src="https://img.shields.io/github/license/yourusername/high_quality_info" alt="license">
  <img src="https://img.shields.io/github/issues/yourusername/high_quality_info" alt="issues">
</p>

A curated news and content aggregation platform powered by AI. High-Signal Aggregator collects signals from various tech and news sources, uses AI for content enrichment, and delivers personalized high-quality information streams.

[English](./README.md) | [中文](./README_zh.md)

## Features

- **Multi-Source Aggregation**: Collects content from HackerNews, GitHub Trending, RSS feeds, and more
- **AI-Powered Enrichment**: Uses LLM to summarize, categorize, and extract key insights from articles
- **Personalized Filtering**: Custom source groups (build, market, news, launch, custom)
- **Multi-language Support**: English, Simplified Chinese, Traditional Chinese
- **Podcast Generation**: Convert articles to podcast scripts using AI
- **User Authentication**: Support for email, Google, and GitHub OAuth
- **Modern UI**: Built with React 19, Tailwind CSS 4, and Radix UI

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma 7
- **Authentication**: NextAuth.js v4
- **Styling**: Tailwind CSS 4 + Radix UI + Framer Motion
- **LLM Providers**: OpenAI, Gemini, DeepSeek, OpenRouter, Zhipu, MiniMax
- **Caching**: Redis (ioredis)
- **i18n**: next-intl

## Agent / MCP Integration

Supports **MCP (Model Context Protocol)** for external AI Agents to directly invoke deployed website features.

### MCP Endpoints

| Endpoint | Description |
|----------|-------------|
| `/.well-known/mcp.json` | Agent Auto-Discovery (MCP Well-Known) |
| `/api/mcp.json` | Tool Manifest |
| `/api/mcp` | JSON-RPC Entry Point |
| `/api/agent/keys` | API Key Management |
| `/agent-setup` | Agent Setup Page |

### Available Tools (9)

| Tool Name | Description |
|-----------|-------------|
| `get_signals` | Get signal filtering by source type list with, date range, tags |
| `get_signal_detail` | Get detailed content of a single signal |
| `get_sources` | Get available sources and subscription status |
| `read_article` | AI reads article and returns summary or translation |
| `mark_as_read` | Mark signal as read |
| `favorite_signal` | Favorite or unfavorite a signal |
| `subscribe_source` | Subscribe or unsubscribe from a source |
| `search_signals` | Search signals by title, summary, tags |
| `get_insights` | Get daily insights (trend analysis, cause analysis, etc.) |

### Authentication

Pass Bearer Token via `Authorization` header:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://your-domain.com/api/mcp
```

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "high-quality-info": {
      "url": "https://your-domain.com/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

Visit [/agent-setup](/agent-setup) for detailed configuration.

### OpenClaw Configuration

OpenClaw uses `exec` to run bash commands (curl). Get the full configuration at:

```bash
curl https://your-domain.com/api/openclaw.json
```

**Quick curl examples:**

```bash
# Get signals (exec curl "url")
curl -s -X GET "https://your-domain.com/api/signals?limit=10" \
  -H "Authorization: Bearer $SIGNAL_API_KEY"

# Get sources
curl -s -X GET "https://your-domain.com/api/sources" \
  -H "Authorization: Bearer $SIGNAL_API_KEY"

# Trigger data fetch
curl -s -X GET "https://your-domain.com/api/cron/fetch" \
  -H "Authorization: Bearer $SIGNAL_API_KEY"
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis (optional, for caching)
- At least one LLM API key (OpenAI, Gemini, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/high_quality_info.git
cd high_quality_info

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
npx prisma db push
npm run db:seed

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/high_quality_info"

# Auth (NextAuth)
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET="

# LLM Provider
LLM_PROVIDER="openai"
OPENAI_API_KEY=""

# Redis (optional)
REDIS_URL="redis://localhost:6379"
```

## Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API routes
│   └── [locale]/       # Internationalized pages
├── components/         # React components
├── lib/
│   ├── scraper/        # Data source scrapers
│   ├── llm/            # LLM integration
│   └── auth/           # Authentication
└── schemas/            # Zod validation schemas
```

## Available Scripts

```bash
npm run dev             # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
npx prisma studio       # Open Prisma database GUI
```

## Deployment

### Vercel (Recommended)

1. Fork this repository
2. Import to Vercel
3. Configure environment variables
4. Deploy

### Docker

```bash
docker build -t high-signal-aggregator .
docker run -p 3000:3000 high-signal-aggregator
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org)
- [Prisma](https://prisma.io)
- [NextAuth.js](https://next-auth.js.org)
- [Tailwind CSS](https://tailwindcss.com)
