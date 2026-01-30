# rl-strings-llc

> Created with **BAS.sh** - Basic Astro Setup (or Bad Ass Setup 😎)

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Bun** | Lightning-fast JavaScript runtime & package manager |
| **Astro** | The web framework for content-driven websites |
| **Convex** | Real-time backend with automatic caching |
| **Tailwind CSS v4** | Utility-first CSS framework |

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your system
- A [Convex](https://convex.dev/) account (free tier available)

### Setup Instructions

#### Step 1: Set up Convex Backend

Open a **new terminal window** and run:

```bash
bunx convex dev
```

This will:
1. Prompt you to log in to Convex (or create an account)
2. Create a new Convex project
3. Display your deployment URL

> 📝 **Keep this terminal running** - it syncs your backend code in real-time

#### Step 2: Configure Environment

Copy the deployment URL from Step 1 and add it to `.env.local`:

```bash
# .env.local
PUBLIC_CONVEX_URL=https://your-project-123.convex.cloud
```

#### Step 3: Start Development

In your **original terminal**, run:

```bash
bun run dev
```

Open [http://localhost:4321](http://localhost:4321) in your browser.

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Astro development server |
| `bun run convex:dev` | Start Convex development server |
| `bun run build` | Build for production |
| `bun run preview` | Preview production build |
| `bun run convex:push` | Deploy Convex to production |

> 💡 **Tip**: Run `bun run dev` and `bun run convex:dev` in separate terminals for the best development experience.

## 📁 Project Structure

```
rl-strings-llc/
├── convex/                 # Convex backend
│   ├── _generated/         # Auto-generated types (git-ignored)
│   ├── schema.ts           # Database schema
│   └── tasks.ts            # Example query/mutation functions
├── src/
│   ├── lib/
│   │   └── convex.ts       # Convex client helper
│   ├── pages/
│   │   └── index.astro     # Home page
│   └── styles/
│       └── global.css      # Global styles (Tailwind)
├── .env.local              # Environment variables (git-ignored)
├── .env.example            # Environment template
├── astro.config.mjs        # Astro configuration
└── package.json
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PUBLIC_CONVEX_URL` | ✅ Yes | Your Convex deployment URL |
| `CONVEX_DEPLOY_KEY` | ❌ No | For production deployments |

### Getting Your Convex URL

1. Run `bunx convex dev` and follow the prompts, OR
2. Go to [Convex Dashboard](https://dashboard.convex.dev) → Your Project → Settings

## 📚 Documentation

- [Astro Documentation](https://docs.astro.build)
- [Convex Documentation](https://docs.convex.dev)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [Bun Documentation](https://bun.sh/docs)

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -m 'Add my feature'`
3. Push to branch: `git push origin feature/my-feature`
4. Open a Pull Request

---

Built with 💜 using [BAS.sh](https://github.com/your-repo/bas)
