# 🎯 M20 — 20 Questions Guessing Game

<p align="center">
  <strong>Think. Answer. Guess.</strong>
</p>

<p align="center">
  An educational 20 Questions-style guessing game with shared learning.
</p>

<p align="center">
  <a href="https://m20quiz.vercel.app/">Live Demo</a>
  ·
  <a href="https://github.com/iamvisshu/m20-game">GitHub Repository</a>
</p>

---

# 📌 PROJECT OVERVIEW

M20 is a browser-based **20 Questions-style guessing game**.

Think of something.

M20 asks questions.

You answer using five confidence-aware answer choices.

M20 narrows down the possibilities and attempts to guess what you were thinking of.

The system also uses anonymous gameplay evidence to improve its shared knowledge model over time.

### Live Application

🌐 **https://m20quiz.vercel.app/**

### Repository

💻 **https://github.com/iamvisshu/m20-game**

---

# 🎓 EDUCATIONAL PURPOSE

M20 is designed as an educational project demonstrating how a guessing system can combine:

- structured knowledge
- candidate scoring
- information gain
- question selection
- confidence-aware answers
- evidence-based learning
- concurrent database updates
- browser application architecture
- serverless database infrastructure

The goal is not simply to create a guessing game.

The goal is to demonstrate how a small interactive application can evolve from a static knowledge model into a continuously improving shared system.

---

# ✨ FEATURES

- 🎯 20 Questions-style guessing gameplay
- 🧠 Information-gain based question selection
- 📊 Candidate scoring
- 🔎 Early guessing when confidence is sufficient
- ⏱️ Maximum question limit
- ✅ Five answer states
    - YES
    - PROBABLY YES
    - UNKNOWN
    - PROBABLY NO
    - NO
- 🧠 Shared learning system
- 📚 Evidence-based knowledge updates
- 🛡️ Database-level concurrency protection
- 🔐 Row Level Security
- 👤 Anonymous gameplay
- 🗂️ Category-based gameplay
- 🏷️ Entity aliases
- 📱 Responsive UI
- ♿ Keyboard accessibility
- 🚀 Vercel production deployment
- 🧪 Unit, integration, E2E and simulation testing
- 🔧 TypeScript strict mode
- ⚡ Vite production build

---

# 🧰 TECHNOLOGY STACK

## Frontend

- React
- TypeScript
- Vite
- CSS

## Backend Infrastructure

- Supabase
- PostgreSQL
- Supabase Auth
- PostgreSQL Row Level Security
- PostgreSQL RPC functions

## Development

- Node.js
- npm
- Git
- GitHub
- GitHub Actions

## Deployment

- Vercel

---

# 🏗️ PROJECT ARCHITECTURE

M20 follows a layered architecture so that the game engine remains independent from the UI and database implementation.

```text
                         ┌──────────────────────┐
                         │      React UI        │
                         │   Browser Client     │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    Game Service      │
                         │ Application Layer    │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │     Game Engine      │
                         │ Candidate Scoring    │
                         │ Question Selection   │
                         │ Termination Logic    │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    Repository Layer  │
                         │ Data Access Contract  │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │       Supabase       │
                         │ PostgreSQL + Auth    │
                         │ RLS + RPC            │
                         └──────────────────────┘
```

---

# 📂 PROJECT STRUCTURE

```text
m20-game
│
├── 📂 .github/
│   └── 📂 workflows/
│       └── CI workflow
│
├── 📂 docs/
│   └── Project documentation
│
├── 📂 public/
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
├── 📂 scripts/
│   └── Development and simulation scripts
│
├── 📂 src/
│   │
│   ├── 📂 app/
│   │   └── Application shell
│   │
│   ├── 📂 components/
│   │   └── Reusable UI components
│   │
│   ├── 📂 domain/
│   │   ├── Entity definitions
│   │   ├── Category definitions
│   │   └── Entity resolution
│   │
│   ├── 📂 engine/
│   │   ├── Candidate scoring
│   │   ├── Question selection
│   │   ├── Termination logic
│   │   └── Game simulation
│   │
│   ├── 📂 features/
│   │   └── 📂 game/
│   │       └── Game-specific application logic
│   │
│   ├── 📂 lib/
│   │   ├── Authentication
│   │   └── Shared utilities
│   │
│   ├── 📂 repositories/
│   │   ├── Repository interfaces
│   │   └── Supabase implementation
│   │
│   └── 📂 styles/
│       └── Application styling
│
├── 📂 supabase/
│   └── 📂 migrations/
│       └── Database schema, security, seed and learning migrations
│
├── 📂 tests/
│   └── Unit, integration, E2E and simulation tests
│
├── 📄 .env.example
├── 📄 index.html
├── 📄 LICENSE
├── 📄 llms.txt
├── 📄 package.json
├── 📄 README.md
└── 📄 vite.config.ts
```

---

# 🧠 GAME ENGINE

The M20 game engine operates on a structured knowledge model.

The core concepts are:

```text
Entity
Attribute
Question
Answer
Evidence
Confidence
Candidate
```

For example:

```text
Entity:     Elephant

Attributes:
    has_fur       = false
    has_tail      = true
    is_animal     = true
    lives_in_water = false
```

Questions are connected to attributes.

The engine uses the current candidate set and available attributes to select useful questions.

---

# 🎲 ANSWER MODEL

M20 intentionally uses five answer states instead of only Yes/No.

```text
YES
PROBABLY YES
UNKNOWN
PROBABLY NO
NO
```

This allows the engine to represent uncertainty instead of forcing every answer into a binary decision.

Conceptually:

```text
YES             → strong positive evidence
PROBABLY YES    → moderate positive evidence
UNKNOWN         → little or no evidence
PROBABLY NO     → moderate negative evidence
NO              → strong negative evidence
```

This evidence is used by the candidate-scoring system.

---

# 📊 QUESTION SELECTION

M20 uses information-gain principles to select questions.

A useful question should divide the remaining candidates effectively.

The engine considers the expected usefulness of available questions rather than simply asking questions in a fixed order.

This allows the system to adapt its questioning based on previous answers.

---

# 🏆 CANDIDATE SCORING

After every answer, M20 updates candidate scores.

Candidates that better match the accumulated evidence receive higher scores.

The engine tracks:

- candidate score
- confidence
- evidence
- score gap
- question count

M20 can make an early guess when the confidence threshold is sufficiently high.

Otherwise, it continues asking questions until the configured maximum is reached.

---

# 🧠 SHARED LEARNING SYSTEM

M20 uses anonymous gameplay evidence to improve the shared knowledge model.

The learning architecture is based on:

```text
Gameplay
    ↓
Answer
    ↓
Evidence
    ↓
Learning Update
    ↓
Entity / Attribute Statistics
    ↓
Improved Future Gameplay
```

A single incorrect answer must not immediately corrupt the global knowledge model.

Learning updates therefore use evidence and confidence rather than blindly replacing existing knowledge.

---

# 🗄️ DATABASE

M20 uses PostgreSQL through Supabase.

The database contains several logical areas.

## Reference Data

```text
categories
entities
entity_categories
attributes
entity_attributes
question_families
questions
entity_aliases
```

## Gameplay

```text
games
game_questions
game_answers
```

## Learning

```text
evidence
entity_attribute_stats
knowledge_history
```

---

# 🔐 SECURITY

M20 uses PostgreSQL Row Level Security (RLS).

The application does not expose privileged database credentials to the browser.

Gameplay mutations are handled through secured database RPC functions.

The general security model is:

```text
Browser
   │
   │ authenticated anonymous session
   ▼
Supabase
   │
   ├── RLS
   │
   ├── RPC authorization
   │
   └── PostgreSQL constraints
```

Direct unauthorized mutation of protected gameplay and learning tables is prevented at the database layer.

---

# 👤 ANONYMOUS GAMEPLAY

M20 does not require users to create a traditional account.

The application uses anonymous authentication so that gameplay can still be associated with an authenticated Supabase session without requiring:

- name
- email
- password
- player profile

The project follows a minimal-data philosophy.

---

# 🗂️ CATEGORIES

Players can start a game using:

- Everything
- Animals
- Everyday Objects
- Food & Drinks
- Household
- Technology
- Vehicles

Category selection reduces the candidate search space and helps M20 reach a guess faster.

---

# 🏷️ ENTITY ALIASES

M20 supports aliases for entities.

For example:

```text
Television
    ├── TV
    └── Television Set

Refrigerator
    └── Fridge

Motorcycle
    └── Motorbike

Aeroplane
    └── Airplane
```

Aliases are normalized before resolution.

This allows different names for the same concept to resolve to the same canonical entity.

---

# 🧪 TESTING

M20 includes multiple levels of automated testing.

## Unit Tests

Used for isolated engine and domain logic.

Examples include:

- candidate scoring
- question selection
- termination logic
- entity resolution

## Integration Tests

Validate interactions between application components and the Supabase game API.

## E2E Tests

Validate real gameplay flows.

## Simulation Tests

Large numbers of simulated games are used to measure:

- accuracy
- average questions
- median questions
- maximum questions
- early guessing
- unanswered games
- incorrect guesses
- confidence
- score gap
- effectiveness

This helps evaluate the engine using measurable results rather than only manual testing.

---

# 📈 SIMULATION BASELINE

The production engine has been evaluated using automated simulations.

The baseline configuration uses:

```text
Maximum Questions: 20
Confidence Threshold: 0.65
Score Gap Threshold: 0.20
```

The simulation suite includes both:

```text
EXACT
```

and

```text
REALISTIC
```

answer modes.

The simulation system is intentionally kept separate from the browser UI so the game engine can be evaluated independently.

---

# ⚙️ CONFIGURATION

Create the local environment file:

```console
cp .env.example .env
```

Required Supabase configuration:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Never place a Supabase service-role key in frontend environment variables.

---

# 🛠️ REQUIRED APPLICATIONS

1. Node.js
2. npm
3. Git
4. IntelliJ IDEA or another IDE
5. GitHub Desktop
6. Supabase CLI
7. A modern web browser

Docker is not required for normal remote Supabase development.

---

# 🚀 LOCAL DEVELOPMENT

Open IntelliJ Terminal or macOS Terminal.

```console
cd /Users/iamvisshu/Documents/GitHub/m20-game
```

Install dependencies:

```console
npm install
```

Start the development server:

```console
npm run dev
```

The application will normally be available at:

```text
http://localhost:5173/
```

---

# 🏗️ PRODUCTION BUILD

Run:

```console
npm run build
```

This performs TypeScript compilation and creates the production Vite bundle.

Build output:

```text
dist/
```

---

# 🔍 PREVIEW PRODUCTION BUILD

Run:

```console
npm run preview
```

This serves the generated production build locally.

---

# 🧪 TEST COMMANDS

Run the project's test suite using the configured Vitest commands.

Typical development workflow:

```console
npm run test
```

For a production validation:

```console
npm run build
```

The repository also contains integration, E2E and simulation test configuration.

---

# 🗄️ SUPABASE DEVELOPMENT

The Supabase project is linked to the M20 repository.

Supabase migrations are stored in:

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

The remote Supabase database is the production database infrastructure for M20.

---

# 🌐 PRODUCTION DEPLOYMENT

M20 is deployed using Vercel.

Production URL:

🌐 **https://m20quiz.vercel.app/**

The production deployment is connected to the GitHub repository.

The production branch is:

```text
main
```

A push to `main` triggers a new Vercel deployment.

---

# 🔄 DEPLOYMENT FLOW

```text
Developer
    │
    ▼
Local development
    │
    ▼
Tests
    │
    ▼
Production build
    │
    ▼
Git commit
    │
    ▼
GitHub main
    │
    ▼
Vercel
    │
    ▼
https://m20quiz.vercel.app/
```

---

# 🔎 SEO

M20 includes basic technical SEO configuration.

The HTML shell contains:

- page title
- meta description
- canonical URL
- robots directive
- Open Graph metadata
- Twitter metadata
- structured data
- sitemap
- robots.txt
- web manifest
- favicon declarations

Canonical production URL:

```text
https://m20quiz.vercel.app/
```

---

# 📱 PWA / DEVICE ICONS

M20 includes device-specific branding assets:

```text
favicon.ico
favicon-16x16.png
favicon-32x32.png
apple-touch-icon.png
android-chrome-192x192.png
android-chrome-512x512.png
```

The project also provides:

```text
site.webmanifest
```

for browser and installable web-app metadata.

---

# 🐛 DEBUG GUIDE

## Application does not start

Check:

```console
node --version
npm --version
```

Then:

```console
npm install
npm run dev
```

---

## Build fails

Run:

```console
npm run build
```

Read the first TypeScript or Vite error reported.

---

## Supabase connection fails

Check:

```text
.env
```

and verify:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Do not expose privileged Supabase credentials.

---

## Database migration issue

Check:

```console
npx supabase migration list
```

Then:

```console
npx supabase db push
```

---

## Production issue

Check:

1. Vercel deployment status
2. Vercel deployment logs
3. Supabase status
4. Browser console
5. Network requests
6. GitHub latest commit

---

# 📋 DATA MODEL OVERVIEW

The high-level relationship is:

```text
Category
   │
   └── Entity
          │
          ├── Alias
          │
          └── Attribute
                 │
                 └── Question

Gameplay
   │
   ├── Game
   ├── Game Question
   └── Game Answer

Learning
   │
   ├── Evidence
   ├── Entity Attribute Stats
   └── Knowledge History
```

---

# 🧩 DESIGN PRINCIPLES

M20 follows several architectural principles.

### Separation of concerns

UI, application logic, game engine and data access are separated.

### Engine independence

The game engine should remain independently testable without requiring the browser UI.

### Evidence-based learning

One answer should not automatically overwrite global knowledge.

### Database-level security

Security is enforced at the database layer rather than relying only on frontend restrictions.

### Minimal personal data

M20 does not require unnecessary personal information.

### Production-minded development

The project includes:

- automated testing
- CI
- database migrations
- security controls
- deployment automation
- performance checks
- documentation

---

# 🔮 FUTURE ROADMAP

Potential future improvements include:

- larger knowledge dataset
- more entity categories
- improved question-generation strategies
- stronger learning algorithms
- additional simulations
- richer analytics
- improved accessibility
- progressive web application enhancements
- additional languages
- improved observability

These are future possibilities and are not required for the current production version.

---

# 💡 INSPIRATION

M20 is inspired by:

- the classic Twenty Questions game
- 20Q-style guessing systems
- gameplay patterns commonly associated with Akinator

The implementation, branding, UI and architecture of M20 are independently developed.

```text
INSPIRATION ≠ COPY
```

M20 uses its own:

- name
- branding
- logo
- UI
- implementation
- knowledge architecture
- database design

---

# ⚖️ INTELLECTUAL PROPERTY

M20's source code is released under the MIT License.

Third-party assets, libraries and dependencies remain subject to their respective licenses.

Do not assume that an asset found online is free to use.

Where third-party attribution is required, the appropriate attribution should be retained.

---

# 🤝 CONTRIBUTING

Contributions are welcome.

Before making substantial changes:

1. Open an issue describing the proposed change.
2. Keep architectural boundaries intact.
3. Add or update tests where appropriate.
4. Verify the production build.
5. Keep database changes inside Supabase migrations.
6. Do not commit secrets.
7. Keep the README and documentation synchronized with major architectural changes.

---

# 📌 VERSION HISTORY

```text
M20
│
├── Initial React + TypeScript + Vite application
├── Domain model
├── Game engine
├── Candidate scoring
├── Information-gain question selection
├── Learning system
├── Supabase integration
├── Database security
├── Automated tests
├── Simulation framework
├── Dataset expansion
├── Entity aliases
├── Category-based gameplay
├── Responsive production UI
├── SEO configuration
├── Custom M20 branding
└── Vercel production deployment
```

---

# 👨‍💻 AUTHOR

**Vishal Vishwakarma**

GitHub: [@iamvisshu](https://github.com/iamvisshu)

Project: [M20](https://m20quiz.vercel.app/)

---

# 📄 LICENSE

M20 is released under the MIT License.

See:

```text
LICENSE
```

for the complete license text.

---

# ⭐ PROJECT

If you find the project interesting, consider starring the repository.

GitHub:

https://github.com/iamvisshu/m20-game

Live Demo:

https://m20quiz.vercel.app/