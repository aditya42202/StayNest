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
2. The production frontend API URL is configured in `frontend/.env.production` as `https://expense-tracker-l07o.onrender.com/api`. If `VITE_API_BASE_URL` is already set in Vercel, update it to the same value because the Vercel environment variable takes precedence. The frontend site URL is `https://pennywise-expense-tracker-ten.vercel.app`.
3. `vercel.json` is already configured to deploy `frontend/` as a static site.

### Render setup

1. Create a Render Web Service in your Render account.
2. Use `render.yaml` to configure the backend service. Set `FRONTEND_URL` and `CLIENT_URL` to `https://pennywise-expense-tracker-ten.vercel.app`; production CORS only allows configured frontend origins. The backend URL is `https://expense-tracker-l07o.onrender.com`; local frontend requests use the Vite proxy at `http://localhost:5000` when running the backend in development mode.
3. Add the same environment variables shown in `render.yaml` using Render secrets or env vars:
   - `MONGO_URI`, `JWT_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `FRONTEND_URL`, `CLIENT_URL`, `ADMIN_SIGNUP_EMAILS`
   - Email uses Gmail SMTP (`EMAIL_HOST=smtp.gmail.com`, `EMAIL_PORT=587`). In the Render service's Environment settings, set `EMAIL_USER` to the Gmail address and `EMAIL_PASS` to that account's Google app password. Do not use the normal Gmail password. Email verification will remain unavailable until both are configured.

Approved bookings can be paid by the tenant through Stripe Checkout. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` on the backend, then configure the Stripe webhook endpoint as `https://<your-backend-url>/api/payments/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `checkout.session.expired` events. Payment is marked complete only after Stripe confirms it.

Owners can set monthly, daily, and hourly rent rates. If daily/hourly rates are omitted, daily defaults to monthly rent divided by 30 and hourly defaults to daily rent divided by 24. Tenants choose hourly, daily, monthly, or yearly billing and either pay upfront or make manual installments. The owner confirms exact start/end times; the backend calculates rent from that duration and the selected rate. Yearly rent is 12 times the monthly rate without a discount.

Admin signup is restricted to the comma-separated email addresses in the backend-only `ADMIN_SIGNUP_EMAILS` environment variable. Tenant and owner signup do not require an allowlisted email.

Account registration and password recovery require the backend email settings (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, and `EMAIL_PASS`). For Gmail SMTP, use `smtp.gmail.com`, port `587`, your Gmail address, and a Google app password. Never use your normal Gmail password. Set `FRONTEND_URL` and `CLIENT_URL` to the frontend URL so verification and reset links open the deployed app; local development can use `http://localhost:5173`. Email verification links expire after 24 hours. Password reset links expire after 15 minutes and can only be used once. Users must verify their email before signing in.

### Stay search and booking

Property categories include hotels, hostels, PGs, student rooms, homestays, guest houses, apartments, shared rooms, hourly stays, one-day stays, and monthly rentals. Search supports destination, dates, guests, accommodation category, billing period, amenities, verified listings, minimum rating, and budget.

Guests select check-in and check-out before submitting a request. The API calculates the quote from the selected duration and rates, checks for overlapping pending or approved stays, and atomically reserves the property/room window before creating the booking. Rejected and cancelled requests release their reservation. MongoDB serializes the reservation update on the property document, so concurrent booking requests for the same window cannot both reserve it. Reservation internals are excluded from public property responses. The quote is retained when the owner approves, so a later price edit cannot silently change the guest's requested total.

The existing Stripe Checkout integration remains the configured payment provider; payment completion is verified by Stripe webhooks or a backend session lookup. Razorpay, student roommate matching, tourist services, and extended booking lifecycle workflows are not part of this implementation phase.

### Role-based search access

The homepage shows categories and featured listings without displaying the advanced search form. Search filters are available on `/search` to authenticated tenant/student/tourist accounts and property owners; guests are redirected to sign in and returned to their requested search URL. The backend applies the same role check to the property search and filtered property-list APIs. Admins use the admin dashboard and are not granted customer search API access. Public featured listings and basic property details remain available to guests.
