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
2. In Vercel project settings, set environment variable:
   - `VITE_API_BASE_URL`: `https://<your-backend-url>`
3. `vercel.json` is already configured to deploy `frontend/` as a static site.

### Render setup

1. Create a Render Web Service in your Render account.
2. Use `render.yaml` to configure the backend service.
3. Add the same environment variables shown in `render.yaml` using Render secrets or env vars:
   - `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `STRIPE_SECRET_KEY`, `GOOGLE_CLIENT_ID`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`

Password recovery requires the backend email settings (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, and `EMAIL_PASS`). Set `CLIENT_URL` to the frontend URL so reset links open the deployed app; `FRONTEND_URL` can be used to override it. Reset links expire after 15 minutes and can only be used once.
