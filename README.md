# Tulete Web App

Welcome to the **Tulete Web Application** repository. This is a modern, high-performance web platform built to deliver a premium user experience with offline capabilities, seamless animations, and scalable architecture.

## 🚀 Overview

Tulete is a comprehensive marketplace platform handling features like Food Delivery, Laundry Services, and General Products. The web application is engineered as a Progressive Web App (PWA) using React, Vite, and TailwindCSS, prioritizing performance, responsiveness, and a glassmorphic, mobile-first design language.

## ✨ Key Features

- **Progressive Web App (PWA)**: Installable on modern devices with offline support and service worker caching for near-instant load times.
- **Modern Authentication**: Secure, modal-based authentication flow managed globally, providing seamless user onboarding without unnecessary redirects.
- **High-Fidelity UI/UX**: Built with Radix UI primitives and Framer Motion micro-animations for a smooth, premium feel.
- **State Management**: Centralized, persistent state management using Zustand, handling theme preferences (Dark/Light mode), auth sessions, and geolocation data.
- **Modular Architecture**: Feature-driven directory structure ensuring high cohesion, low coupling, and scalability.
- **Automated CI/CD**: Fully dockerized deployment with Nginx for optimized asset delivery, automated via GitHub Actions to a Contabo VPS.

## 🛠️ Technology Stack

- **Framework**: [React 18](https://reactjs.org/) & [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) & [Radix UI](https://www.radix-ui.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Routing**: [React Router v6](https://reactrouter.com/)
- **Forms & Validation**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Backend/BaaS**: [Firebase](https://firebase.google.com/) (Auth, Firestore)
- **Deployment**: Docker, Nginx, GitHub Actions

## 📁 Project Structure

The codebase follows a feature-sliced design pattern:

```text
src/
├── app/          # App-wide configurations (routing, providers)
├── core/         # Core singletons, utilities, and global stores (e.g., theme, auth)
├── features/     # Feature-specific modules (auth, food, laundry, products, users)
│   └── [feature]/
│       ├── components/  # Feature-specific UI
│       ├── hooks/       # Feature-specific logic
│       ├── pages/       # Route-level components
│       └── store/       # Feature-specific state
├── layouts/      # Structural layout components (Root, DynamicShell)
├── shared/       # Reusable cross-feature components (UI, Skeletons, Layout wrappers)
└── assets/       # Static assets and global styles
```

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mushi2/Tulete-Web.git
   cd Tulete-Client-New/tulete_web_app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env` file in the root directory and populate it with your Firebase configuration and API keys (refer to `.env.example` if available):
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   # Add other required variables...
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`.

## 🐳 Docker & Production Deployment

This project is fully containerized for production deployment.

1. **Build the Docker Image**:
   ```bash
   docker build -t tulete-web .
   ```

2. **Run the Container**:
   ```bash
   docker run -p 80:80 tulete-web
   ```

The application uses **Nginx** inside the container to serve the static built files efficiently and handle SPA routing fallbacks.

## 🧪 Scripts

- `npm run dev`: Starts the Vite development server.
- `npm run build`: Compiles TypeScript and builds the app for production.
- `npm run preview`: Previews the production build locally.
- `npm run lint`: Runs ESLint to identify and report on patterns in JavaScript/TypeScript.

## 🤝 Contribution Guidelines

1. **Branching Strategy**: Use `feature/branch-name` for new features and `bugfix/branch-name` for bug fixes.
2. **Code Style**: Ensure you run `npm run lint` before committing. We strictly enforce typing with TypeScript.
3. **Commits**: Write clear, descriptive commit messages.
4. **Pull Requests**: Open PRs against the `main` branch and ensure CI checks pass before requesting a review.

## 📄 License

This project is proprietary and confidential. Unauthorized copying of this file, via any medium, is strictly prohibited.
