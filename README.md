# AI-Powered-Smart-Support-Backend

![Express](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white) ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white) ![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

> Intelligent customer support ticketing and automated response backend using semantic search, vector embeddings, and LLM resolution engines.

---

## 📋 Table of Contents
- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Available Scripts](#-available-scripts)
- [API & Route Modules](#-api--route-modules)
- [Contributing](#-contributing)
- [Author & License](#-author--license)

---

## 📌 Overview
**AI-Powered-Smart-Support-Backend** is designed to provide a comprehensive, maintainable, and scalable solution in the **AI & Backend / Customer Support** domain. Engineered with modern industry standards and clean architecture.

---

## ✨ Key Features
- **Semantic Knowledge Base Search**: Find relevant documentation via vector embeddings
- **Automated Ticket Resolution**: Draft AI responses based on knowledge base context
- **Human Handoff**: Seamless escalation of complex issues to live agents

---

## 🛠️ Tech Stack
- **Express.js**
- **MongoDB / Mongoose**
- **Redis**
- **JWT Authentication**
- **Docker**

---

## 📂 Project Structure
```text
AI-Powered-Smart-Support-Backend/
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── src/
│   ├── config/
│   │   ├── db.js
│   │   ├── env.js
│   │   ├── openai.js
│   │   └── redis.js
│   ├── controllers/
│   │   ├── adminController.js
│   │   ├── authController.js
│   │   ├── chatController.js
│   │   ├── feedbackController.js
│   │   ├── kbController.js
│   │   └── ticketController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── errorHandler.js
│   │   ├── notFound.js
│   │   ├── rateLimiter.js
│   │   ├── requestContext.js
│   │   └── requireRole.js
│   ├── models/
│   │   ├── AuditLog.js
│   │   ├── Conversation.js
│   │   ├── Feedback.js
│   │   ├── KnowledgeArticle.js
│   │   ├── Message.js
│   │   ├── Ticket.js
│   │   └── User.js
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   ├── chatRoutes.js
│   │   ├── feedbackRoutes.js
│   │   ├── kbRoutes.js
│   │   └── ticketRoutes.js
│   ├── services/
│   │   ├── aiService.js
│   │   ├── knowledgeService.js
│   │   ├── openaiService.js
│   │   └── ticketService.js
│   ├── utils/
│   │   ├── appError.js
│   │   └── slugify.js
│   ├── app.js
│   └── server.js
├── test/
│   ├── integration.test.js
│   └── smoke.test.js
├── .gitignore
├── docker-compose.yml
├── Document.doc
├── package-lock.json
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18.x or higher recommended)
- **npm**, **yarn**, or **pnpm**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/WEB-TechWhiz/AI-Powered-Smart-Support-Backend.git
   cd AI-Powered-Smart-Support-Backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```


5. **Start the development server:**
   ```bash
   npm run dev
   ```


## 📜 Available Scripts

In the project directory, you can run:

| Command | Action |
|---|---|
| `npm run start` (or `npm test` / `npm start`) | `node src/server.js` |
| `npm run dev` (or `npm test` / `npm start`) | `nodemon src/server.js` |
| `npm run test` (or `npm test` / `npm start`) | `node --test test/smoke.test.js test/integration.test.js` |

## 🛣️ API & Route Modules

- Modules located in `src/routes/`: `adminRoutes.js`, `authRoutes.js`, `chatRoutes.js`, `feedbackRoutes.js`, `kbRoutes.js`, `ticketRoutes.js`

## 🤝 Contributing
Contributions, feedback, and pull requests are warmly welcomed!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 👤 Author & License
- **Maintainer**: [WEB-TechWhiz](https://github.com/WEB-TechWhiz)
- **License**: Distributed under the MIT License.
