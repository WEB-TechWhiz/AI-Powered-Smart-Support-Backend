# 🤖 AI-Powered Smart Customer Support Backend

A production-grade, highly scalable **Node.js + Express backend** designed to orchestrate AI-assisted customer support tickets. The system features JWT-based authentication, MongoDB data persistence, Redis-driven rate limiting, and OpenAI-powered ticket categorization, priority evaluation, and draft reply generation.

---

## ⚡ Core Architecture & Features

### 1. Smart Triage Pipeline (OpenAI Integration)
* Automatically analyzes incoming client messages to classify customer **sentiment** (e.g., Frustrated, Inquiring, Happy).
* Determines ticket **priority** (e.g., Critical, High, Medium, Low) based on request urgency.
* Generates a context-aware **draft response** for customer service representatives to review and approve, speeding up response times by up to 70%.

### 2. Scalable Security & Infrastructure
* **JWT-Based Authentication**: Secure authentication via access and refresh tokens stored in secure HTTP-only cookies.
* **Redis Rate Limiting**: Intelligent rate limiter preventing API abuse and safeguarding LLM resource usage.
* **Dockerized Setup**: Multi-container architecture using `docker-compose` to link the Node app, MongoDB, and Redis instances instantly.

---

## 🛠️ Technology Stack

| Layer | Technologies | Description |
| :--- | :--- | :--- |
| **Core** | Node.js, Express.js | Event-driven runtime and REST framework |
| **AI Integration** | OpenAI SDK (GPT-4 / GPT-3.5-Turbo) | Advanced LLM for ticket processing |
| **Database** | MongoDB, Mongoose | Document database for storage & user accounts |
| **Cache & Limit** | Redis | Memory database for rate-limiting & session storage |
| **Container** | Docker, Docker-compose | Isolated dev/prod infrastructure orchestration |

---

## 📂 System Architecture
```
├── src/
│   ├── config/          # Environment & Database config
│   ├── controllers/     # Route logic handlers (auth, ticket, AI triage)
│   ├── middlewares/     # Auth checks, error handling, rate limiting
│   ├── models/          # Mongoose Schemas (User, Ticket, Analytics)
│   ├── routes/          # REST Endpoint definitions
│   ├── services/        # OpenAI API wrappers
│   └── app.js           # Express App initialization
├── docker-compose.yml   # Multi-container script
└── package.json         # Dependencies and scripts
```

---

## 🚀 Getting Started

### Prerequisites
* Docker and Docker Compose Installed OR Local Node.js, MongoDB, and Redis installed.

### Setup Instructions
1. Clone this repository and rename `.env.example` to `.env`. Populate the variables:
   ```env
   PORT=8080
   MONGODB_URI=mongodb://localhost:27017/support_db
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=your_secret_key
   OPENAI_API_KEY=your_openai_key
   ```
2. Launch using Docker:
   ```bash
   docker-compose up --build
   ```
3. The server will launch on `http://localhost:8080`.
