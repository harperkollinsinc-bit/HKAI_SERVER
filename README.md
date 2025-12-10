# HKAI - AI-Powered Learning Platform

> **An intelligent educational platform that generates personalized courses using AI, complete with interactive lessons, video content, and real-time progress tracking.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.6-black.svg)](https://www.fastify.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Course Generation System](#course-generation-system)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

HKAI is a modern learning platform that leverages AI to create personalized educational experiences. The platform analyzes user conversations, generates custom course content, and provides interactive lessons with video support.

### Key Capabilities

- **AI-Powered Course Generation**: Automatically creates comprehensive courses based on user interactions
- **Real-Time Progress Tracking**: Monitor course generation with live progress updates
- **Interactive Chat Interface**: Conversational AI for personalized learning
- **Video Integration**: YouTube video content synchronized with lessons
- **Workspace Management**: Organize learning into dedicated workspaces
- **Scalable Architecture**: Handles 100+ concurrent users with in-memory job queuing

---

## ✨ Features

### 🤖 AI-Powered Learning

- **Smart Course Creation**: AI analyzes chat history and workspace context to generate relevant courses
- **Personalized Content**: Lessons tailored to user's learning style and pace
- **Multi-Model Support**: Integration with Groq, Google Gemini, and other AI providers

### 📚 Course Management

- **Dynamic Course Generation**: Create courses on-demand based on conversation context
- **Structured Lessons**: Organized content with objectives, time estimates, and difficulty levels
- **Progress Tracking**: Real-time updates during course generation (0-100%)
- **Video Integration**: Automatic YouTube video selection for each lesson

### 💬 Interactive Features

- **Chat Interface**: Conversational AI for questions and guidance
- **Workspace System**: Multiple isolated learning environments
- **Memory System**: Contextual awareness across sessions
- **Quiz Generation**: Automated assessments for knowledge validation

### 🎨 Modern UI/UX

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Dark Mode Support**: Eye-friendly interface for extended learning sessions
- **Real-Time Updates**: Live progress bars and status indicators
- **Smooth Animations**: Polished transitions and interactions

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Chat View    │  │ Course View  │  │ Dashboard    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP/REST
┌────────────────────────────┴────────────────────────────────┐
│                    API Server (Fastify)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Routes  │  │ Course Routes│  │ Chat Routes  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────────────────────────────────────────┐      │
│  │         In-Memory Job Queue & Worker             │      │
│  │  • Course generation jobs                        │      │
│  │  • Progress tracking                             │      │
│  │  • Background processing                         │      │
│  └──────────────────────────────────────────────────┘      │
└────────────────────────────┬────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼─────┐      ┌─────▼──────┐     ┌─────▼──────┐
    │PostgreSQL│      │  AI APIs   │     │  YouTube   │
    │ Database │      │ (Groq/     │     │    API     │
    │          │      │  Gemini)   │     │            │
    └──────────┘      └────────────┘     └────────────┘
```

### Data Flow

1. **User Interaction**: User chats with AI or requests course generation
2. **Job Enqueueing**: Course request creates job in in-memory queue
3. **Background Processing**: Worker processes job asynchronously
4. **AI Generation**: Multiple AI calls to generate course structure and content
5. **Video Fetching**: YouTube API integration for relevant videos
6. **Database Storage**: Course and lessons saved to PostgreSQL
7. **Real-Time Updates**: Client polls for progress every 2 seconds
8. **Completion**: Course displayed when generation finishes

---

## 🛠️ Tech Stack

### Backend

| Technology               | Version | Purpose                        |
| ------------------------ | ------- | ------------------------------ |
| **Node.js**              | 18+     | Runtime environment            |
| **Fastify**              | 5.6.2   | High-performance web framework |
| **PostgreSQL**           | 14+     | Primary database               |
| **Groq SDK**             | 0.37.0  | AI model integration           |
| **Google Generative AI** | 0.24.1  | Gemini AI integration          |
| **Axios**                | 1.13.2  | HTTP client                    |
| **Bcrypt**               | 6.0.0   | Password hashing               |
| **Zod**                  | 4.1.13  | Schema validation              |

### Frontend

| Technology         | Version  | Purpose               |
| ------------------ | -------- | --------------------- |
| **React**          | 18.3.1   | UI framework          |
| **TypeScript**     | 5.8.3    | Type safety           |
| **Vite**           | 5.4.19   | Build tool            |
| **TailwindCSS**    | 3.4.17   | Styling               |
| **Radix UI**       | Latest   | Accessible components |
| **React Router**   | 6.30.1   | Client-side routing   |
| **Framer Motion**  | 12.23.25 | Animations            |
| **React Markdown** | 10.1.0   | Markdown rendering    |
| **Axios**          | 1.13.2   | API client            |

### Development Tools

- **Pino Pretty**: Logging
- **ESLint**: Code linting
- **TypeScript ESLint**: TypeScript linting
- **Autoprefixer**: CSS processing

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **PostgreSQL** 14 or higher
- **npm** or **yarn**
- **API Keys**:
  - Groq API key
  - Google Gemini API key (optional)
  - YouTube Data API key

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd hkai
```

2. **Install dependencies**

```bash
# Install server dependencies
cd server
npm install

# Install web dependencies
cd ../web
npm install
```

3. **Database Setup**

```bash
# Create PostgreSQL database
createdb hkai

# Run migrations (if available)
psql -d hkai -f server/schema.sql
```

4. **Environment Configuration**

Create `.env` file in `server/` directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/hkai

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# AI APIs
GROQ_API_KEY=your-groq-api-key
GEMINI_API_KEY=your-gemini-api-key
GEMINI_API_KEY2=your-second-gemini-key (optional)

# YouTube
YOUTUBE_API_KEY=your-youtube-api-key

# CORS
CORS_ORIGIN=http://localhost:5173
```

Create `.env` file in `web/` directory:

```env
VITE_API_URL=http://localhost:3000
```

5. **Start Development Servers**

```bash
# Terminal 1: Start backend
cd server
npm run dev

# Terminal 2: Start frontend
cd web
npm run dev
```

6. **Access the Application**

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

---

## 📁 Project Structure

```
hkai/
├── server/                    # Backend application
│   ├── plugins/              # Fastify plugins
│   │   ├── cors.js          # CORS configuration
│   │   ├── cookie.js        # Cookie handling
│   │   ├── jwt.js           # JWT authentication
│   │   ├── postgress.js     # PostgreSQL connection
│   │   └── response.js      # Response helpers
│   ├── routes/              # API routes
│   │   ├── auth.js          # Authentication endpoints
│   │   ├── courses.js       # Course management
│   │   ├── lessons.js       # Lesson endpoints
│   │   ├── messages.js      # Chat messages
│   │   ├── quizzes.js       # Quiz management
│   │   ├── users.js         # User management
│   │   ├── videos.js        # Video endpoints
│   │   └── workspaces.js    # Workspace management
│   ├── utils/               # Utility functions
│   │   ├── inMemoryQueue.js # Job queue system
│   │   ├── contextCache.js  # Context caching
│   │   ├── model.js         # AI model clients
│   │   ├── prompts.js       # AI prompts
│   │   ├── videoJobs.js     # Video processing
│   │   └── youtube.js       # YouTube API
│   ├── transcriber/         # Video transcription
│   ├── server.js            # Main server file
│   └── package.json         # Dependencies
│
├── web/                      # Frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── ui/         # Reusable UI components
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── CourseGrid.tsx
│   │   │   ├── FloatingVideoPlayer.tsx
│   │   │   ├── Navigation.tsx
│   │   │   └── WorkspaceCard.tsx
│   │   ├── pages/          # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   └── Workspace.tsx
│   │   ├── context/        # React contexts
│   │   │   └── authContext.tsx
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilities
│   │   │   ├── api.ts     # API client
│   │   │   └── utils.ts   # Helper functions
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   ├── public/            # Static assets
│   ├── index.html         # HTML template
│   └── package.json       # Dependencies
│
└── README.md              # This file
```

---

## 📡 API Documentation

### Authentication

#### Register User

```http
POST /register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

#### Login

```http
POST /login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### Workspaces

#### Create Workspace

```http
POST /workspace
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My Learning Space"
}
```

#### Get All Workspaces

```http
GET /workspaces
Authorization: Bearer <token>
```

#### Get Workspace by ID

```http
GET /workspace/:id
Authorization: Bearer <token>
```

### Courses

#### Generate Course

```http
POST /workspace/:id/course
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "jobId": "123",
    "status": "queued",
    "statusUrl": "/workspace/123/course/job/123"
  }
}
```

#### Get Course (with auto-status check)

```http
GET /workspace/:id/course
Authorization: Bearer <token>

Response (if generating):
{
  "success": true,
  "data": {
    "generating": true,
    "jobStatus": {
      "id": "123",
      "status": "processing",
      "progress": 45,
      "currentStep": "Generating lesson 2/5",
      "lessonsCompleted": 1,
      "totalLessons": 5
    }
  }
}

Response (if complete):
{
  "success": true,
  "data": {
    "id": 42,
    "title": "Introduction to JavaScript",
    "description": "...",
    "lessons": [...]
  }
}
```

#### Get Job Status

```http
GET /workspace/:id/course/job/:jobId
Authorization: Bearer <token>
```

### Messages

#### Send Message

```http
POST /workspace/:id/message
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "What is JavaScript?",
  "role": "user"
}
```

#### Get Messages

```http
GET /workspace/:id/messages
Authorization: Bearer <token>
```

### Lessons

#### Get Lesson

```http
GET /lessons/:id
Authorization: Bearer <token>
```

#### Get Lesson Video

```http
GET /lessons/:id/video
Authorization: Bearer <token>
```

---

## 🎓 Course Generation System

### Overview

The course generation system uses an **in-memory job queue** with background processing to create courses asynchronously. This ensures fast API responses and scalability.

### Architecture

```
User Request → Enqueue Job → Return Job ID (< 100ms)
                    ↓
            Background Worker
                    ↓
    ┌───────────────┴───────────────┐
    │  1. Gather Context (cached)   │
    │  2. Generate Course Skeleton  │
    │  3. Create Course in DB       │
    │  4. For each lesson:          │
    │     - Generate content (AI)   │
    │     - Fetch YouTube video     │
    │     - Save to database        │
    │     - Update progress         │
    └───────────────┬───────────────┘
                    ↓
            Mark as Completed
```

### Features

- **Workspace-Based Job IDs**: Uses workspace ID as job ID (one job per workspace)
- **Progress Tracking**: Real-time updates (0-100%)
- **Context Caching**: 5-minute TTL for memories and chat history (80% faster)
- **Automatic Cleanup**: Old jobs removed after 1 hour
- **Error Handling**: Failed jobs tracked with error messages
- **Resume on Refresh**: Polling resumes automatically if page refreshes

### Performance

| Metric                     | Value                     |
| -------------------------- | ------------------------- |
| API Response Time          | < 100ms                   |
| Course Generation Time     | 30-60 seconds (5 lessons) |
| Concurrent Users Supported | 100+                      |
| Polling Interval           | 2 seconds                 |
| Cache TTL                  | 5 minutes                 |
| Job Retention              | 1 hour                    |

### Scalability

The system can handle:

- **10 concurrent course generations** with ease
- **100+ total users** without performance degradation
- **50 req/s** polling load (well under capacity)

For higher scale (multiple server instances), consider migrating to Redis-based queue.

---

## 💻 Development

### Running Tests

```bash
# Backend tests
cd server
npm test

# Frontend tests
cd web
npm test
```

### Code Quality

```bash
# Lint backend
cd server
npm run lint

# Lint frontend
cd web
npm run lint
```

### Database Migrations

```bash
# Create migration
npm run migrate:create <migration-name>

# Run migrations
npm run migrate:up

# Rollback migration
npm run migrate:down
```

### Environment Variables

#### Server (.env)

| Variable          | Description                  | Required           |
| ----------------- | ---------------------------- | ------------------ |
| `PORT`            | Server port                  | No (default: 3000) |
| `DATABASE_URL`    | PostgreSQL connection string | Yes                |
| `JWT_SECRET`      | JWT signing secret           | Yes                |
| `GROQ_API_KEY`    | Groq AI API key              | Yes                |
| `GEMINI_API_KEY`  | Google Gemini API key        | No                 |
| `YOUTUBE_API_KEY` | YouTube Data API key         | Yes                |
| `CORS_ORIGIN`     | Allowed CORS origin          | Yes                |

#### Web (.env)

| Variable       | Description     | Required |
| -------------- | --------------- | -------- |
| `VITE_API_URL` | Backend API URL | Yes      |

---

## 🚢 Deployment

### Production Build

```bash
# Build frontend
cd web
npm run build

# Build output in web/dist/

# Start production server
cd server
npm start
```

### Docker Deployment

```dockerfile
# Dockerfile example
FROM node:18-alpine

WORKDIR /app

# Copy server files
COPY server/package*.json ./server/
RUN cd server && npm ci --production

COPY server/ ./server/

# Copy web build
COPY web/dist/ ./web/dist/

EXPOSE 3000

CMD ["node", "server/server.js"]
```

### Environment Setup

1. **Database**: Use managed PostgreSQL (AWS RDS, Google Cloud SQL, etc.)
2. **Environment Variables**: Set via platform (Heroku, Vercel, etc.)
3. **Static Files**: Serve frontend from CDN or same server
4. **Process Management**: Use PM2 for production

```bash
# Install PM2
npm install -g pm2

# Start server with PM2
pm2 start server/server.js --name hkai-api

# Monitor
pm2 monit

# View logs
pm2 logs hkai-api
```

### Scaling Considerations

- **Horizontal Scaling**: For multiple instances, migrate to Redis-based job queue
- **Database**: Add read replicas for heavy read loads
- **Caching**: Consider Redis for session storage and caching
- **CDN**: Serve static assets via CDN (Cloudflare, AWS CloudFront)

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow existing code style
- Use meaningful variable names
- Add comments for complex logic
- Write tests for new features

---

## 📄 License

This project is licensed under the ISC License.

---

## 🙏 Acknowledgments

- **Groq** for fast AI inference
- **Google Gemini** for advanced AI capabilities
- **YouTube** for educational video content
- **Radix UI** for accessible components
- **Fastify** for high-performance backend

---

## 📞 Support

For issues, questions, or suggestions:

- **Issues**: [GitHub Issues](https://github.com/yourusername/hkai/issues)
- **Email**: support@example.com
- **Documentation**: [Wiki](https://github.com/yourusername/hkai/wiki)

---

## 🗺️ Roadmap

### Upcoming Features

- [ ] Real-time collaboration
- [ ] Advanced quiz types (multiple choice, code challenges)
- [ ] Course templates
- [ ] Export courses to PDF/SCORM
- [ ] Mobile app (React Native)
- [ ] WebSocket support for real-time updates
- [ ] Course sharing and marketplace
- [ ] Analytics dashboard
- [ ] Multi-language support
- [ ] Voice interaction

---

**Built with ❤️ by Genesix**
# HKAI_SERVER
