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

## Agent Integration (Skill-Only)

This project uses a **Skill-first** integration model for AI Agents. MCP has been removed.

### Agent Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/skill.json` | Full skill manifest with all commands |
| `/api/openclaw.json` | OpenClaw config (exec + curl) |
| `/api/agent/keys` | API key management |
| `/agent-setup` | Setup page for key generation and command examples |

### Authentication

Use Bearer token in `Authorization` header:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://your-domain.com/api/signals?limit=5
```

### Install Skill

```bash
curl https://your-domain.com/api/skill.json
```

Install the downloaded config into your Agent skill directory, then set `SIGNAL_API_KEY`.

### OpenClaw

```bash
curl https://your-domain.com/api/openclaw.json
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
