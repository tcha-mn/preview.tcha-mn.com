# tcha-mn.com

Source for the TCHa (Twin Cities Habitation Alliance) website. This repo builds a static site with Astro and pulls content from Sanity.

The site was originally bootstrapped from the AstroWind template <https://github.com/onwidget/astrowind>.

## Tech stack

- Astro (static output)
- Tailwind CSS + some React components
- Sanity (content API via GROQ)
- Luxon (date handling)

## Repository structure

```
/
├── .github/workflows/        GitHub Actions workflows (build + deploy)
├── public/                   Static files copied as-is
├── src/
│   ├── assets/               Local images/styles imported by Astro
│   ├── components/           Astro/React components
│   ├── layouts/              Page layouts
│   ├── pages/                Route entry points
│   ├── queries/              Sanity GROQ queries + data access
│   ├── utils/                Config + helpers
│   ├── config.yaml           Site + Sanity config
│   └── navigation.js         Site nav model
├── astro.config.mjs          Astro configuration
├── package.json              Scripts + dependencies
└── ...
```

## Conventions

- Route files live in `src/pages/` and map directly to URLs.
- Shared UI is in `src/components/` and `src/layouts/`.
- Sanity data access is centralized in `src/queries/`.
- Site configuration lives in `src/config.yaml` and is loaded by `src/utils/config.ts`.
- Static assets that don’t need processing go in `public/`.

## Local development

- Node >= 22 (CI uses Node 24).

Common commands:

```
# Install dependencies
npm install

# Run the dev server
npm run dev

# Build the site
npm run build

# Preview a production build
npm run preview
```

## Preview "now" date (scheduled content)

Some content is date-gated in Sanity queries. You can override the build date using `PREVIEW_NOW` (format `YYYY-MM-DD`).

- When set, `src/queries/sanity.ts` uses `PREVIEW_NOW` as a local date in `America/Chicago` (00:00:01) and converts it to UTC for groq.
- When unset, it uses the current time.

Local example:

```
PREVIEW_NOW=2025-01-01 npm run build
```

## Deployment overview

This repo is the canonical source (`tcha-mn/tcha-mn.com`), but **builds only run in the preview repo** (`tcha-mn/preview.tcha-mn.com`). The workflow file is shared between repos and guarded by a repo check so it only runs in the preview repo.

### Preview repo behavior (`tcha-mn/preview.tcha-mn.com`)

Workflow: `.github/workflows/00-deploy.yml`

Triggers:

- `push` to `main`
- `workflow_dispatch` (optional `preview_date`)
- `schedule` (nightly)
- `repository_dispatch` (Sanity rebuild button)

Jobs:

- **Build Site**: builds once and uploads the GitHub Pages artifact.
- **Deploy to Preview Site**: publishes to preview GitHub Pages.
- **Promotion to Live**:
  - **Auto**: `schedule` or `repository_dispatch` (no approval).
  - **Manual**: other events require the `live` environment approval.
  - **Blocked**: if `preview_date` is set, promotion is skipped.

Promotion pushes the Pages artifact to the live repo’s `gh-pages` branch and preserves commit history.

### Live repo behavior (`tcha-mn/tcha-mn.com`)

- GitHub Pages should be configured to serve from the `gh-pages` branch (root).
- The default branch (`main`) is not used for publishing and does not build.

## Required settings and secrets

In the preview repo:

- `SSH_DEPLOY_KEY` secret with write access to the live repo.
- `live` environment configured with required reviewers (for manual promotions).

In the live repo:

- GitHub Pages source set to `gh-pages` (root).

## Notes

- The [preview site](https://preview.tcha-mn.com) is password-protected via Cloudflare. The [live site](https://tcha-mn.com) is publicly accessible.
- The workflow run URL is recorded in the live `gh-pages` commit message for traceability.
