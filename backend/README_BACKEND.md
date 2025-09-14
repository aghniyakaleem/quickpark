# QuickPark Backend - Notes

This backend implements the location-scoped valet ticketing system with:
- JWT auth for SUPER_ADMIN and VALET.
- Location onboarding with slug, public URL (/l/:slug).
- Ticket lifecycle and enforced status transitions.
- WhatsApp notifications via Twilio sandbox (configured through environment variables).
- Razorpay integration for payment creation and webhook handling (test mode).
- Socket.io real-time events per location room `location:<locationId>`.

Environment variables are required (see .env.example in project root). Use `npm install` then `npm run dev` for local development.

Seed script (scripts/seed.mjs) is provided at repo root to create initial super-admin, two locations, and valets.