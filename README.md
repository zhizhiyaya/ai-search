# AI Search

An AI-powered semantic search application that helps users find relevant information using natural language queries, even when the search terms don't exactly match the content.

## Features

- Semantic search using AI embeddings
- Vector database for efficient similarity matching
- Modern React frontend with Material-UI
- Koa backend with TypeScript
- SQLite database with vector support

## Project Structure

```
ai-search/
├── src/
│   ├── index/          # Frontend React application
│   ├── server/         # Backend Koa server
│   └── utils/          # Shared utilities
├── .env               # Environment variables
└── package.json       # Project configuration
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   cd src/index && npm install
   cd ../server && npm install
   ```

2. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Add your OpenAI API key and other configuration

3. Start development servers:
   ```bash
   npm run dev
   ```

## Development

- Frontend runs on: http://localhost:5173
- Backend runs on: http://localhost:3000

## Building for Production

```bash
npm run build
```
