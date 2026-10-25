# 🎯 M20 — 20 Questions Guessing Game

<p align="center">
  <strong>Think. Answer. Guess.</strong>
</p>

<p align="center">
  A 20 Questions-style guessing game powered by structured knowledge, adaptive questioning, and shared learning.
</p>

<p align="center">
  <a href="https://m20quiz.vercel.app/">🎮 Play M20</a>
  ·
  <a href="https://github.com/iamvisshu/m20-game">💻 Source Code</a>
</p>

---

## 🎮 What is M20?

**M20** is a browser-based 20 Questions-style guessing game.

Think of something, choose a category, and answer a series of questions using five confidence-aware responses:

```text
YES
PROBABLY YES
UNKNOWN
PROBABLY NO
NO
```

M20 uses those answers to narrow the candidate set, select useful questions, and eventually make a guess.

The system also records anonymous gameplay evidence to improve its shared knowledge model over time.

### 🌐 Live Demo

**https://m20quiz.vercel.app/**

---

## ✨ Features

- 🎯 20 Questions-style guessing gameplay
- 🧠 Adaptive question selection using information-gain principles
- 📊 Candidate scoring and confidence estimation
- 🎲 Five-state answers instead of simple Yes/No
- ⚡ Early guessing when confidence is high
- 🔢 Configurable maximum question limit
- 🗂️ Category-based gameplay
- 🏷️ Entity aliases and normalized resolution
- 🧠 Evidence-based shared learning
- 🔐 PostgreSQL Row Level Security
- 🛡️ Secured database RPC boundaries
- 👤 Anonymous gameplay
- 📱 Responsive interface
- ♿ Keyboard-accessible interaction
- 🧪 Unit, integration, E2E and simulation tests
- 🚀 Vercel deployment
- 🔎 Technical SEO and structured metadata
- 📱 Custom favicon and web-app branding

---

## 🧠 How M20 Works

At a high level, a game follows this flow:

```text
Player
  │
  ▼
Choose Category
  │
  ▼
Start Game
  │
  ▼
Candidate Entities
  │
  ▼
Select Useful Question
  │
  ▼
Player Answers
  │
  ▼
Update Candidate Scores
  │
  ├───────────────┐
  │               │
  ▼               ▼
High Confidence   Continue
  │               │
  ▼               ▼
Make Guess     Select Next Question
  │               │
  └───────┬───────┘
          ▼
        Result
          │
          ▼
    Learning Evidence
```

The game engine is intentionally separated from the React UI and database layer so that its logic can be tested independently.

---

## 🧩 Game Engine

M20 uses a structured knowledge model built around:

```text
Entity
Attribute
Question
Answer
Evidence
Confidence
Candidate
```

Questions are associated with attributes, while entities contain evidence about those attributes.

The engine uses the current candidate set and available questions to select questions that are expected to provide useful information.

Candidate scores are updated after each answer.

When the engine has sufficient confidence, it can make an early guess. Otherwise, it continues until the configured question limit is reached.

---

## 🎲 Five-State Answer Model

Instead of forcing players into binary answers, M20 supports uncertainty:

```text
YES             → strong positive evidence
PROBABLY YES    → moderate positive evidence
UNKNOWN         → little or no evidence
PROBABLY NO     → moderate negative evidence
NO              → strong negative evidence
```

This allows the engine to work with imperfect human answers rather than treating every response as absolute truth.

---

## 🧠 Shared Learning

M20 uses anonymous gameplay evidence to improve its shared knowledge model.

The learning flow is:

```text
Gameplay
   ↓
Answer
   ↓
Evidence
   ↓
Learning Update
   ↓
Knowledge Statistics
   ↓
Improved Future Games
```

Learning is evidence-based rather than replacing knowledge immediately after a single answer.

This helps prevent one incorrect response from disproportionately changing the global knowledge model.

---

## 🏗️ Architecture

M20 follows a layered architecture:

```text
┌──────────────────────────┐
│       React UI           │
│      Browser Client      │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│      Game Service        │
│    Application Layer     │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│       Game Engine        │
│                          │
│ Candidate Scoring        │
│ Question Selection       │
│ Termination Logic        │
│ Simulation               │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│    Repository Layer      │
│      Data Access         │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│        Supabase          │
│ PostgreSQL · Auth · RLS  │
│          RPC             │
└──────────────────────────┘
```

The main architectural goal is to keep the **game engine independent of React and Supabase**.

---

## 🧰 Technology Stack

| Layer                  | Technology              |
|------------------------|-------------------------|
| UI                     | React                   |
| Language               | TypeScript              |
| Build Tool             | Vite                    |
| Styling                | CSS                     |
| Database               | PostgreSQL              |
| Backend Infrastructure | Supabase                |
| Authentication         | Supabase Anonymous Auth |
| Database Security      | PostgreSQL RLS          |
| Database API           | PostgreSQL RPC          |
| Testing                | Vitest + Playwright     |
| CI                     | GitHub Actions          |
| Hosting                | Vercel                  |

---

## 📂 Project Structure

The repository is organized around the application layers rather than exposing every file.

```text
m20-game/
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── public/
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── android-chrome-192x192.png
│   ├── android-chrome-512x512.png
│   ├── apple-touch-icon.png
│   ├── robots.txt
│   ├── sitemap.xml
│   └── site.webmanifest
│
├── src/
│   ├── domain/              # Core domain models and entity resolution
│   ├── engine/              # Scoring, question selection and game logic
│   ├── features/game/       # Game application logic
│   ├── lib/                 # Supabase, auth and shared utilities
│   ├── repositories/        # Data-access abstractions and implementation
│   ├── components/          # Reusable UI components
│   ├── App.tsx              # Main application
│   └── App.css              # Application styling
│
├── supabase/
│   └── migrations/          # Database schema, security and data migrations
│
├── tests/                   # Unit, integration, E2E and simulation tests
│
├── .env.example             # Environment variable template
├── index.html               # HTML shell and SEO metadata
├── LICENSE                  # MIT License
├── llms.txt                 # AI-readable project information
├── package.json
├── README.md
└── vite.config.ts
```

---

## 🗂️ Categories

Players can currently choose from:

- **Everything**
- **Animals**
- **Everyday Objects**
- **Food & Drinks**
- **Household**
- **Technology**
- **Vehicles**

Selecting a category reduces the candidate search space and can help M20 reach a useful guess faster.

---

## 🔐 Security & Privacy

M20 is designed around a minimal-data model.

Players do not need to provide:

- Name
- Email
- Password
- Personal profile
- Precise location

Anonymous authentication provides an authenticated session without requiring a traditional account.

Database security is enforced through PostgreSQL rather than relying only on frontend restrictions.

The application uses:

- Row Level Security
- Protected database RPC functions
- Database constraints
- Authenticated access controls
- No service-role key in the browser

---

## 🧪 Testing

M20 uses multiple testing layers.

### Unit Tests

Core domain and game-engine logic is tested independently.

Examples include:

- candidate scoring
- question selection
- termination logic
- entity resolution
- game engine behavior

### Integration Tests

Validate application interaction with the hosted Supabase game and learning APIs.

### E2E Tests

Validate browser-level gameplay flows.

### Simulation Tests

The deterministic game engine can also be evaluated through automated simulations.

This makes it possible to measure gameplay behavior using repeatable scenarios instead of relying only on manual testing.

---

## 🚀 Local Development

### Requirements

- Node.js
- npm
- Git
- A modern web browser
- Supabase project for database-backed development

### 1. Clone the repository

```console
git clone https://github.com/iamvisshu/m20-game.git
cd m20-game
```

### 2. Install dependencies

```console
npm install
```

### 3. Configure environment variables

Create `.env` from the example:

```console
cp .env.example .env
```

Set:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Never place a Supabase service-role key in frontend environment variables.

### 4. Start development server

```console
npm run dev
```

Open:

```text
http://localhost:5173/
```

---

## 🏗️ Production Build

Create a production build with:

```console
npm run build
```

The generated application is written to:

```text
dist/
```

Preview the production build locally:

```console
npm run preview
```

---

## 🧪 Testing Commands

Run the standard test suite:

```console
npm test
```

Run linting:

```console
npm run lint
```

Run formatting:

```console
npm run format
```

Create a production build:

```console
npm run build
```

The repository also contains dedicated integration, E2E and simulation test configuration.

---

## 🗄️ Supabase

Database migrations are stored in:

```text
supabase/migrations/
```

Check migration status:

```console
npx supabase migration list
```

Push migrations:

```console
npx supabase db push
```

The production application uses the hosted Supabase project for database and authentication infrastructure.

---

## 🌐 Deployment

M20 is deployed on Vercel.

### Production

**https://m20quiz.vercel.app/**

The deployment is connected to the GitHub repository.

The production branch is:

```text
main
```

The normal deployment flow is:

```text
Local Development
       ↓
Tests
       ↓
Production Build
       ↓
Git Commit
       ↓
GitHub
       ↓
Vercel
       ↓
Production
```

---

## 🔎 SEO

M20 includes technical SEO configuration for the production site.

The application provides:

- descriptive page title
- meta description
- canonical URL
- Open Graph metadata
- social sharing metadata
- structured data
- `robots.txt`
- XML sitemap
- web manifest
- favicon declarations

Production canonical URL:

```text
https://m20quiz.vercel.app/
```

---

## 📱 Web & Device Branding

M20 includes custom branding assets for browsers and supported devices:

```text
favicon.ico
favicon-16x16.png
favicon-32x32.png
apple-touch-icon.png
android-chrome-192x192.png
android-chrome-512x512.png
```

The project also includes:

```text
site.webmanifest
```

for web-app metadata and supported installation experiences.

---

## 🗺️ Roadmap

Future improvements may include:

- Larger knowledge dataset
- More categories
- More entities and aliases
- Improved question-selection strategies
- More sophisticated learning algorithms
- Expanded simulation coverage
- Progressive Web App enhancements
- Improved accessibility
- Additional languages
- Better observability and analytics

The current production version focuses on establishing a reliable foundation for these improvements.

---

## 💡 Inspiration

M20 is inspired by the classic **Twenty Questions** concept and the broader category of guessing systems such as 20Q and Akinator.

The project has its own:

- Name
- Branding
- Logo
- UI
- Implementation
- Architecture
- Database design
- Knowledge model

```text
INSPIRATION ≠ COPY
```

M20 is an independently developed educational project.

---

## 🤝 Contributing

Contributions and suggestions are welcome.

For substantial changes:

1. Open an issue describing the proposed change.
2. Keep the existing architectural boundaries intact.
3. Add or update tests where appropriate.
4. Verify the production build.
5. Keep database changes inside Supabase migrations.
6. Never commit secrets or credentials.
7. Update documentation when major behavior or architecture changes.

---

## 📄 License

M20 is released under the **MIT License**.

See [`LICENSE`](LICENSE) for the complete license text.

Third-party libraries and assets remain subject to their respective licenses.

---

## 👨‍💻 Author

**Vishal Vishwakarma**

GitHub: [@iamvisshu](https://github.com/iamvisshu)

Project: [m20-game](https://github.com/iamvisshu/m20-game)

Live Demo: [m20quiz.vercel.app](https://m20quiz.vercel.app/)

---

## ⭐ Support the Project

If you find M20 interesting or useful, consider giving the repository a ⭐ on GitHub.

**🎮 Play M20:**  
https://m20quiz.vercel.app/

**💻 GitHub:**  
https://github.com/iamvisshu/m20-game