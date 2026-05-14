# APSLibros

[![Deploy to GitHub Pages](https://github.com/AnnPasz/APSLibros/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/AnnPasz/APSLibros/actions/workflows/deploy-pages.yml)

APSLibros is a small web app that scans a book barcode (ISBN), deciphers title/author/publisher/year using Open Library metadata, and auto-populates a book record form.

## Features

- Camera ISBN scanning via `html5-qrcode`
- Manual ISBN input fallback
- ISBN-10 and ISBN-13 normalization/validation
- Open Library metadata lookup and autofill
- Basic unit tests for ISBN parsing helpers

## Tech Stack

- React + TypeScript + Vite
- Vitest for tests

## Local Setup

```bash
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`).

## Test and Build

```bash
npm run test
npm run build
```

## Connect to your GitHub repo

If your GitHub repo already exists and is named `APSLibros`, run:

```bash
git init
git add .
git commit -m "Initial APSLibros web app"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

Example URL format:

`https://github.com/<your-username>/APSLibros.git`

## Publish as a GitHub Page

This repository is configured to deploy automatically to GitHub Pages on every push to `main` using GitHub Actions.

- Expected live URL: `https://annpasz.github.io/APSLibros/`
- Workflow file: `.github/workflows/deploy-pages.yml`

If this is your first deployment, check GitHub once:

1. Open repository **Settings** → **Pages**
2. Ensure **Source** is set to **GitHub Actions**
3. Open the **Actions** tab and confirm the workflow run succeeds