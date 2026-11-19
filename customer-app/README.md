# Salora Glam — customer app

The app customers use to find salons, book services and order products for pickup.
Web app (React + Vite + Tailwind) that also builds into Android and iPhone apps with Capacitor.
It uses the **same API server and database** as the salon app (`server/`), through its own
endpoints under `/api/v1/customer` and its own sign-in.

## What customers can do

| Screen | What it does |
|---|---|
| Explore | Search salons by name, service or area; filter by salon type (Unisex, Women's parlour, Men's salon, Spa, Spa + salon) and city |
| Salon | Services with price and duration, products with stock at each branch, branches with address, phone and opening hours |
| Book | Pick up to 5 services → stylist (or *any*) → day → free time → note → **request**. The time is held at once; the salon confirms or declines |
| Cart | Products from one branch → **pickup order**. No payment in the app: paid at the counter |
| My bookings | Upcoming / past, live status (*Requested → Confirmed → Completed*, or the salon's decline reason), cancel, call the salon |
| My orders | *Placed → Confirmed → Ready → Collected*, cancel while not packed, call the salon |
| Profile | Name, email, gender, birthday; **My salons**: visits, total spent, wallet balance, membership and recent bills at every salon that knows your number |

Sign-in is **mobile number + 6-digit SMS code only** (no email, no password).

## What the salon sees (salon app)

* **App requests** page (sidebar, with a badge): booking requests to confirm/decline, product orders to confirm, mark ready, and **Bill at counter**.
  Billing an order completes it and takes stock; billing a booking completes all its services.
* Dashboard card **Customer app** with waiting requests, today's app bookings, open orders and 30-day totals.
* **Settings → Customer app**: show/hide the salon in the app, salon type, "about" text; per branch: city, take bookings, take product orders.
* App bookings also appear in **Queue & chairs** marked "booked in app".
* Platform admin: salon list filters *Salon type* and *Customer app*, and customer-app numbers on the Overview.

## Run it on your computer

```bash
# 1. the API (in server/) — with the customer-app migration applied
cd server && npm run db:migrate && npm run dev
# 2. the customer app
cd customer-app
npm install
npm run setup        # creates .env from .env.example (VITE_API_BASE_URL=http://localhost:4000/api/v1)
npm run dev          # http://localhost:5174
```

In development `SMS_PROVIDER=console` and `OTP_DEV_ECHO=true` (server/.env): no SMS is sent, the code is printed
in the server log and shown on the sign-in screen.

## Sending real SMS codes (production)

Set **one** provider on the API server (Render → Environment):

* **MSG91 (India):** `SMS_PROVIDER=msg91`, `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`.
  The template must be DLT-approved and contain the variable `##OTP##`
  (e.g. "##OTP## is your Salora Glam sign-in code. It expires in 10 minutes.").
* **Twilio:** `SMS_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`.

Until a provider is set, sign-in on a production server answers "Sign-in by SMS is not set up yet" — it never
pretends a code was sent. Limits: a new code every 30 s, 5 codes per number per hour, 5 tries per code, codes last 10 minutes.

## Put the website online (Render static site)

* Root directory `customer-app`, build command `npm install && npm run build`, publish directory `dist`.
* Environment: `VITE_API_BASE_URL=https://YOUR-API.onrender.com/api/v1`.
* Redirects/Rewrites: source `/*` → destination `/index.html` → action **Rewrite** (so links like `/s/salon-name` open).
* On the **API** service set `CUSTOMER_APP_ORIGIN=https://YOUR-CUSTOMER-SITE.onrender.com` (and keep `COOKIE_SECURE=true`).

## Android and iPhone apps (Capacitor)

App id `com.abaccotech.saloraglam.customer`, name **Salora Glam** (separate from the salon app `com.abaccotech.saloraglam`).

```bash
cd customer-app
# once: put your live API address in .env.android and .env.ios (must be https)
npx cap add android          # once — creates customer-app/android
npx cap add ios              # once, on a Mac — creates customer-app/ios
npm run app:icons            # app icon + splash from customer-app/assets/

npm run build:android        # build + copy into the Android project
npm run android:open         # open Android Studio → Run / Build → Generate signed bundle

npm run build:ios            # build + copy into the iOS project (Mac)
npm run ios:open             # open Xcode → Run / Product → Archive
```

On the API server add the app origins: `EXTRA_CORS_ORIGINS=https://localhost,capacitor://localhost`.
In the app the session is kept in the phone's private app storage, so customers stay signed in until they sign out.

## Files

```
customer-app/
  capacitor.config.json   app id/name, splash and status bar colours
  .env.example / .env.android / .env.ios   API address per build (public values only)
  src/App.jsx             screens and which need sign-in
  src/lib/api.js          API client (refresh + retry; refresh token in app storage on phones)
  src/lib/auth.jsx        sign-in state (mobile + SMS code)
  src/lib/cart.jsx        product cart (one branch at a time, kept on the device)
  src/lib/native.js       Android back button, status bar, splash, secure storage
  src/pages/*.jsx         Explore, Salon, Book, Cart, Bookings, Orders, Profile, Login, Welcome
  src/components/*.jsx    UI pieces, tab bar, toasts
```

Server side: `server/src/features/customer-app/` (customer API + sign-in), `server/src/features/online/`
(salon's App requests), `server/src/core/sms/sms.js` (SMS providers), migration `20261118000000_customer_app`.
