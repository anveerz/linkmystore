# LinkMyStore Deployment (Vercel + custom domain)

## 1) Prepare environment variables

Create `.env.local` for local dev from `.env.example`.

In Vercel, add the same keys in:
`Project -> Settings -> Environment Variables`

Required keys:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `GEMINI_API_KEY`
- `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`
- `NEXT_PUBLIC_APP_URL` (set to `https://linkmystore.in`)
- `PLATFORM_FEE_PERCENT` (default `4`)

## 2) Push code to GitHub

```powershell
git init
git add .
git commit -m "chore: initial deploy-ready setup"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

## 3) Deploy on Vercel (free)

1. Go to Vercel dashboard and click `Add New -> Project`.
2. Import the GitHub repository.
3. Keep framework as `Next.js`.
4. Add environment variables before first production deploy.
5. Deploy.

## 4) Attach domain `linkmystore.in`

In Vercel:

1. Open project -> `Settings -> Domains`.
2. Add `linkmystore.in`.
3. Add `www.linkmystore.in` and set redirect preference as needed.

At your domain registrar DNS:

- Apex/root record:
  - Type: `A`
  - Name: `@`
  - Value: `76.76.21.21`
- `www` record:
  - Type: `CNAME`
  - Name: `www`
  - Value: `cname.vercel-dns.com`

After DNS propagates, Vercel provisions HTTPS automatically.
