# Module 7 — Conversational Booking & Transaction Engine

Adds autonomous appointment scheduling, configurable free/paid bookings, optional Stripe Checkout, demo checkout fallback, and centralized booking analytics shared by Web and Flutter.

## Flow
Customer chat → booking intent extraction → service matching → real-time tenant booking conflict check → appointment reservation → optional payment session → confirmation.

All booking records carry `tenant_id`; dashboard queries are tenant scoped.

## APIs
- `POST /api/bot/book-appointment`
- `POST /api/payments/create-session`
- `PUT /api/tenant/settings/booking`
- `GET /api/analytics/bookings/monthly`
- `GET /api/analytics/bookings/time-wise`
- `GET /api/analytics/bookings/category`
- `GET /api/appointments`
- `GET/POST /api/booking/services`
- `POST /api/public/chat`

## Payment modes
`free` confirms immediately. `paid` creates a pending-payment appointment and checkout session. If `STRIPE_SECRET_KEY` is absent, demo checkout is used so the feature remains runnable locally.

## Current scheduling format
The autonomous parser accepts ISO date (`YYYY-MM-DD`), 24-hour time (`HH:MM`), service wording, and email in chat. For production, a natural-language date parser/calendar connector can be added without changing the booking API.
