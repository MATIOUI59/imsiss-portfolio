# IMSISS-themed application portfolio (Cloudflare Worker) — NOT YET DEPLOYED

This is a sibling project to the CyberSure-themed site (`../../newww_cybersure`),
rebuilt for a different application: the **IMSISS Erasmus Mundus Scholarship**
(International Master in Security, Intelligence & Strategic Studies).

Same content about Mouad, same chatbot/contact-form functionality, but a
different visual identity — inspired by (not copied from) the real IMSISS
site's navy → blue → cyan gradient on a light institutional background,
instead of the CyberSure variant's dark terminal/hacker theme. No IMSISS logo,
imagery or text is reproduced; see the Colophon section on the page itself.

Everything here has been built and tested **locally only**. Nothing has been
pushed to Cloudflare yet, on purpose — this waits for a final site name /
domain decision.

## Local preview

```bash
cd cf-worker
python -m http.server 8091 --directory public
```

## First-deploy checklist (when ready to go live)

1. **Pick the final name.** Update `name` in `wrangler.toml` (this becomes
   part of the `*.workers.dev` URL, e.g. `<name>.<subdomain>.workers.dev`).

2. **Deploy once** to get a URL:
   ```bash
   npm install
   npx wrangler login   # if not already authenticated
   npx wrangler deploy
   ```

3. **Create the KV namespace** for contact-form submissions, then uncomment
   and fill in the `[[kv_namespaces]]` block in `wrangler.toml`:
   ```bash
   npx wrangler kv namespace create CONTACT_MESSAGES
   ```
   Redeploy after editing `wrangler.toml`.

4. **Update `ALLOWED_ORIGINS`** in `wrangler.toml` to the real deployed URL(s),
   then redeploy.

5. **Create a Turnstile widget** (Cloudflare dashboard → Turnstile → Add
   widget) with the deployed hostname(s) added. Replace
   `YOUR_TURNSTILE_SITE_KEY` in `public/index.html` (both
   `#turnstileContainer` and `#turnstileContactContainer`) with the real site
   key, then:
   ```bash
   npx wrangler secret put TURNSTILE_SECRET_KEY
   ```

6. **Anthropic API key** (smart chatbot replies) — same as the CyberSure
   project:
   ```bash
   npx wrangler secret put ANTHROPIC_API_KEY
   ```

7. **Resend API key** (emails contact-form submissions to
   matiouimouad9@gmail.com) — same as the CyberSure project:
   ```bash
   npx wrangler secret put RESEND_API_KEY
   ```

Every one of these fails open: with no key/widget configured, the chatbot
falls back to its rule-based answers and the contact form still saves to KV
(once that's created) — nothing breaks while you set things up incrementally.

## Editing the site

Canonical files live in `cf-worker/public/`. The repo root keeps an identical
copy for reference — after editing `public/`, copy changes back to the root
too. Bump the `?v=N` query strings in `index.html` when you change CSS/JS so
browsers don't serve a stale cached copy after a redeploy.
