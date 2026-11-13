# Deploy on Railway

One Railway **project** with two **services** from this GitHub repo:

| Service | What it runs | Config file |
|---|---|---|
| `web` | The website (Next.js), always on | `deploy/railway/web.json` |
| `keeper` | `run-all --send` every 5 minutes (orders → NFT images → WTH buyback), then exits | `deploy/railway/keeper.json` |

No server to manage. Contracts run on NEAR; Railway only hosts the site and the cron job.

## 1. Create the project

1. Push this repo to a **private** GitHub repo (you push — I never push).
2. Railway → **New Project → Deploy from GitHub repo** → pick the repo. This creates the first service; rename it `web`.
3. In the project, **+ New → GitHub Repo** → same repo again → rename it `keeper`.
4. For each service: **Settings → Config-as-code → Config file path**:
   - web → `deploy/railway/web.json`
   - keeper → `deploy/railway/keeper.json`
   (Leave **Root Directory** empty — both build from the monorepo root with pnpm.)

## 2. Variables

Copy from the templates and fill in:
- web → `deploy/railway/web.env.example`
- keeper → `deploy/railway/keeper.env.example`

Rules:
- `NEXT_PUBLIC_*` values are baked into the site at **build** time → after changing them, **redeploy** `web`.
- Mark `KEEPER_PRIVATE_KEY` and `PINATA_JWT` as **sealed** secrets. Never commit them, never paste them in chat.
- Use a **function-call access key** for the keeper (limited to the core + buyback contracts), not a full-access key.
- While testing Contract A, point the variables at the `t1…` accounts; for launch, switch them to the real accounts.

Until `NEXT_PUBLIC_CORE_CONTRACT` / `NEXT_PUBLIC_MARKET_CONTRACT` are set, the site shows its labelled demo data.

## 3. Domain

web → **Settings → Networking → Custom Domain** → enter your domain → add the CNAME record Railway shows at your DNS provider (Cloudflare DNS works; set the record to **DNS only / grey cloud** at first so Railway can issue the certificate).
Keep the Contract A test on Railway's generated `*.up.railway.app` URL; attach the real domain only for Contract B.

## 4. Check it's working

- web: open the URL → homepage, Marketplace, My Collection, WTH page load; `/api/status` returns JSON.
- keeper: **Deployments → latest run → Logs** should show
  `orders: …`, `media: …`, `buyback: …` lines every 5 minutes and exit cleanly.
  First time, deploy it **without** `--send` (edit the start command) to see a dry run, then switch back.

## Notes

- Railway's cron runs the job at most every 5 minutes; the mint page's own refresh + "Continue my order" covers anything in between.
- Containers don't keep files: buyback round snapshots are pinned to IPFS (logged as `snapshot published: ipfs://…`) when `PINATA_JWT` is set.
- Node 22 is pinned via `.node-version`; pnpm comes from `packageManager` in `package.json`.
