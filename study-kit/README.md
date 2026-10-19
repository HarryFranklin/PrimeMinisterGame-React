# study-kit

Shared study code and wording for **both** apps (game and wiki). Edit here only.

- `src/content/infoAndConsent.ts` – information sheets + consent statements (live and pilot versions).
- `src/content/questions.ts` – baseline and post-test questions.
- `src/config.ts` – worker URL, Prolific completion links, minimum screen size.

Each app copies `src/` into its own `.study-kit/` folder before `npm run dev` / `npm run build`
(`node ../study-kit/sync.mjs .study-kit`). That copy is git-ignored – never edit it.

Cloudflare Pages: add `study-kit/*` to **both** projects' build watch paths so a wording
change rebuilds both apps.
