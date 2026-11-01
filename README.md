# StayNest AI

StayNest AI is a full-stack MERN booking platform for students, professionals, PG owners, and admins. It includes modern responsive UI, dashboards, JWT authentication, property search, bookings, payments, and AI-ready features.

## Structure

- `frontend/` — React + Tailwind + Framer Motion UI
- `backend/` — Express API with MongoDB, JWT auth, Cloudinary, Stripe

## Run locally

1. `cd backend && npm install`
2. Create `.env` from `.env.example`
3. `npm run dev`
4. `cd ../frontend && npm install`
5. `npm run dev`

## Deploy

- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

### Vercel setup

1. Create a Vercel project from this repository.
2. The production frontend API URL is configured in `frontend/.env.production` as `https://staynest-1-ihrf.onrender.com/api`. If `VITE_API_BASE_URL` is already set in Vercel, update it to the same value because the Vercel environment variable takes precedence. The frontend site URL is `https://stay-nest-eight.vercel.app`.
3. `vercel.json` is already configured to deploy `frontend/` as a static site.

### Render setup

1. Create a Render Web Service in your Render account.
2. Use `render.yaml` to configure the backend service. Set `FRONTEND_URL`, `CLIENT_URL`, and `CORS_ALLOWED_ORIGINS` to the production frontend origin `https://stay-nest-eight.vercel.app`. Render supplies `PORT`; the server listens on that value. The backend URL is `https://staynest-1-ihrf.onrender.com`; local frontend requests use the Vite proxy at `http://localhost:5000` in development.
3. Add these variables in Render's Environment settings: `NODE_ENV`, `MONGO_URI`, `JWT_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `CLIENT_URL`, `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_VERIFICATION_TOKEN_TTL_MINUTES`, `EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS`, and `ADMIN_SIGNUP_EMAILS`. Render injects `PORT`. Treat credentials as secrets and never commit them. For email:
   - **Recommended on Render:** set `EMAIL_PROVIDER=resend`, create a Resend API key, verify the sender domain, and set `RESEND_API_KEY` and `EMAIL_FROM` (for example, `StayNest <noreply@your-verified-domain.com>`). The service uses Resend's HTTPS API on port 443 and does not open an SMTP connection during startup.
   - SMTP remains available by setting `EMAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_SECURE`. Use port `465` with `SMTP_SECURE=true` for implicit TLS, or port `587`/`2525` with `SMTP_SECURE=false` for STARTTLS. Use the provider's submission host and credentials. Existing `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, and `EMAIL_PASS` settings remain supported as aliases. Do not use Gmail's normal password; if Gmail supports your deployment, use an App Password. SMTP connection timeouts indicate that the host cannot establish a connection in time and are commonly caused by provider/network egress restrictions; use the HTTPS API if that persists.
   - `EMAIL_VERIFICATION_TOKEN_TTL_MINUTES` and `EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS` default to `30` and `60`. Email configuration is validated and logged safely at startup; an unavailable mail provider does not prevent the API from starting. Configure `FRONTEND_URL`, `CLIENT_URL`, and `CORS_ALLOWED_ORIGINS` to the deployed frontend origin.

Approved bookings can be paid by the tenant through Stripe Checkout. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` on the backend, then configure the Stripe webhook endpoint as `https://<your-backend-url>/api/payments/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `checkout.session.expired` events. Payment is marked complete only after Stripe confirms it.

Owners can set monthly, daily, and hourly rent rates. If daily/hourly rates are omitted, daily defaults to monthly rent divided by 30 and hourly defaults to daily rent divided by 24. Tenants choose hourly, daily, monthly, or yearly billing and either pay upfront or make manual installments. The owner confirms exact start/end times; the backend calculates rent from that duration and the selected rate. Yearly rent is 12 times the monthly rate without a discount.

Admin signup is restricted to the comma-separated email addresses in the backend-only `ADMIN_SIGNUP_EMAILS` environment variable. Tenant and owner signup do not require an allowlisted email.

Account registration and password recovery require a configured email provider. Prefer `EMAIL_PROVIDER=resend` with `RESEND_API_KEY` and an `EMAIL_FROM` address on a verified sender domain; the API uses HTTPS. Otherwise use `EMAIL_PROVIDER=smtp` and configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_SECURE`. Port `465` requires implicit TLS (`SMTP_SECURE=true`); ports `587` and `2525` use STARTTLS (`SMTP_SECURE=false`). `EMAIL_FROM` optionally sets the SMTP sender and defaults to `SMTP_USER`. Existing `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, and `EMAIL_PASS` environment variables are accepted for migration. In production, set `FRONTEND_URL`, `CLIENT_URL`, and `CORS_ALLOWED_ORIGINS` to the deployed frontend origin; verification and reset links use `FRONTEND_URL`. For local development, set both URLs to `http://localhost:5173` and run the backend with `NODE_ENV=development`. Verification links expire after `EMAIL_VERIFICATION_TOKEN_TTL_MINUTES` (30 by default) and resend requests are subject to `EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS` (60 by default). Password reset links expire after 15 minutes and can only be used once. Users must verify their email before signing in.

### Stay search and booking

Property categories include hotels, hostels, PGs, student rooms, homestays, guest houses, apartments, shared rooms, hourly stays, one-day stays, and monthly rentals. Search supports destination, dates, guests, accommodation category, billing period, amenities, verified listings, minimum rating, and budget.

Guests select check-in and check-out before submitting a request. The API calculates the quote from the selected duration and rates, checks for overlapping pending or approved stays, and atomically reserves the property/room window before creating the booking. Rejected and cancelled requests release their reservation. MongoDB serializes the reservation update on the property document, so concurrent booking requests for the same window cannot both reserve it. Reservation internals are excluded from public property responses. The quote is retained when the owner approves, so a later price edit cannot silently change the guest's requested total.

The existing Stripe Checkout integration remains the configured payment provider; payment completion is verified by Stripe webhooks or a backend session lookup. Razorpay, student roommate matching, tourist services, and extended booking lifecycle workflows are not part of this implementation phase.

### Role-based search access

The homepage shows categories and featured listings without displaying the advanced search form. Search filters are available on `/search` to authenticated tenant/student/tourist accounts and property owners; guests are redirected to sign in and returned to their requested search URL. The backend applies the same role check to the property search and filtered property-list APIs. Admins use the admin dashboard and are not granted customer search API access. Public featured listings and basic property details remain available to guests.
