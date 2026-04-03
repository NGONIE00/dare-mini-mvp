# Dare — The Digital Council

> **Voice for everyone, on any connection.**

[![Live Demo](https://img.shields.io/badge/demo-dare--mini--mvp.vercel.app-D97706?style=flat-square)](https://dare-mini-mvp.vercel.app)
[![License](https://img.shields.io/badge/license-MIT-059669?style=flat-square)](LICENSE)
[![Stack](https://img.shields.io/badge/stack-Next.js%20·%20Supabase%20·%20Agora-3B82F6?style=flat-square)](#tech-stack)
[![Stage](https://img.shields.io/badge/stage-prototype-D97706?style=flat-square)](#)

---

## What is Dare?

**Dare** (*/daː.ɾe/* · Shona) — *a traditional community council gathering where every voice has a seat.*

Dare is a digital-inclusive voice platform built for the Global South. It enables community members to host, join, and monetise live voice sessions — on any device, on any connection, with or without a smartphone.

Where Clubhouse requires a smartphone and broadband, Dare works on a basic feature phone over USSD. Where Spotify requires 120 KB/min, Dare uses 8 KB/min — fully intelligible on 2G.

**Starting in Zimbabwe. Built for the world.**

---

## The Problem

| Challenge | Impact |
|---|---|
| ~68% of Global South users lack smartphone access | Excluded from all existing voice platforms |
| Mobile data costs 5–10× higher than developed markets | Audio streaming is financially prohibitive |
| Creator platforms require bank accounts | Locks out informal economy workers |
| Algorithms control audience reach | Creators lose sovereignty over their communities |

---

## The Solution

```
Feature phone user dials *447#  →  Browses rooms via USSD menu
                                →  Joins audio via phone call
                                →  Tips host via EcoCash / M-Pesa
                                →  No smartphone. No data plan. No app store.

Smartphone user opens dare.app  →  Full Clubhouse-style experience
                                →  AI-assisted hosting tools
                                →  Real-time voice with speaking indicators
                                →  Analytics dashboard for grant reviewers
```

---

## Live Demo

**→ [dare-mini-mvp.vercel.app](https://dare-mini-mvp.vercel.app)**

| Page | URL | Description |
|---|---|---|
| Rooms | `/rooms` | Browse and join live sessions |
| Feature phone | `/ussd` | Interactive *447# USSD simulator |
| Analytics | `/analytics` | Real-time impact metrics |
| Demo accounts | `/demo` | Sign in as any community persona |
| Register | `/register` | Create an account with your phone number |

### Demo accounts

Sign in at `/demo` as any of these community personas:

| Name | Role | Specialty |
|---|---|---|
| Dr. Tendai Moyo | Host | Community health, Harare |
| Farai Choto | Host | Small-scale agriculture, Masvingo |
| Nomsa Dube | Host | Digital rights & education |
| Tatenda Ncube | Host | Local news & governance |
| Rudo Zimba | Host | Mental health & youth |
| Grace Thompson | Host | Travel & tourism |
| Chiedza Mutasa | Listener | CS student |
| Blessing Phiri | Listener | Retired teacher |
| Simba Chikowore | Listener | Youth entrepreneur |

---

## Key Features

### For Listeners
- 🎧 Join live voice rooms from any device
- 📱 Feature phone access via `*447#` USSD
- 📶 Auto-adapts audio quality to connection (2G → WiFi)
- 💛 Tip hosts via EcoCash, Mukuru, OneMoney, M-Pesa
- 🤚 Raise hand to request speaking time
- 🔔 Real-time notifications

### For Hosts
- 🎙️ Create and manage voice rooms
- ✨ AI-generated room descriptions and post-session summaries
- 🛡️ AI content moderation on chat messages
- 🤖 AI host assistant — suggests responses to listener questions
- 🎟️ Ticketed rooms with mobile money payment gates
- ⏺️ Session recording uploaded to Supabase Storage
- 📊 Earnings dashboard with tip and ticket breakdown
- 🔇 Remote mute control over participants

### Platform
- 🌍 27 countries supported at registration
- 🗣️ Multilingual — host in any language
- 🔒 Phone number authentication (no email required)
- 📡 Real-time via Supabase Realtime + Agora RTC
- 🤖 AI features powered by Claude (Anthropic)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                        │
│  Next.js 16 · TypeScript · Tailwind v4 · Vercel         │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │  Rooms   │  │  USSD    │  │Dashboard │  │Analytics│ │
│  │  /rooms  │  │  /ussd   │  │/dashboard│  │/analytics│ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
└─────────────────────┬───────────────────────────────────┘
                      │ API Routes
          ┌───────────┼───────────┐
          │           │           │
     /agora-token  /api/ai    Supabase
          │           │        Client
          ▼           ▼
   ┌────────────┐  ┌──────────────────┐
   │ Agora RTC  │  │ Anthropic Claude │
   │ Voice call │  │ claude-sonnet-4  │
   │ Token gen  │  │ · Room summaries │
   └────────────┘  │ · Moderation     │
                   │ · Descriptions   │
                   │ · Recommendations│
                   └──────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   SUPABASE LAYER                        │
│                                                         │
│  PostgreSQL          Realtime          Storage          │
│  ┌──────────┐       ┌──────────┐      ┌──────────┐     │
│  │ profiles │       │ rooms    │      │ profiles │     │
│  │ rooms    │  ───► │ messages │      │ (avatars)│     │
│  │ messages │       │ notifs   │      │recordings│     │
│  │ follows  │       └──────────┘      └──────────┘     │
│  │ wallets  │                                           │
│  │ transact.│       Auth                                │
│  │ notifs   │       Phone → email workaround            │
│  └──────────┘       (Production: Twilio SMS OTP)        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│               FEATURE PHONE ACCESS                      │
│                                                         │
│  User dials *447#  →  USSD Gateway  →  Dare Backend    │
│  (any phone)          (NetOne/Econet)   (Node handler) │
│                                                         │
│  Audio join via standard phone call — no data needed   │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL + RLS) |
| Realtime | Supabase Realtime (broadcast + postgres_changes) |
| Auth | Supabase Auth (phone-as-email prototype) |
| Storage | Supabase Storage (avatars, recordings) |
| Voice | Agora RTC (Opus codec, adaptive bitrate) |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| Deployment | Vercel |

---

## AI Features

All AI features are routed through `/app/api/ai/route.ts` and powered by Claude:

| Feature | Trigger | Description |
|---|---|---|
| **Room descriptions** | ✨ AI write button | Generates a community-focused session description |
| **Content moderation** | Every chat message | Flags harmful content before it posts |
| **Host assistant** | Hand raise toast | Suggests a response to the listener's question |
| **Room summary** | Session ends | 3–5 sentence summary of key topics discussed |
| **Room recommendations** | Rooms page load | Personalised room suggestions based on follow history |

---

## Database Schema

```sql
profiles       -- user identity, bio, avatar, user_type (host/listener)
rooms          -- session metadata, status, ticket config, recording
room_participants -- who is in which room + payment_status
messages       -- chat messages per room
follows        -- follower/following relationships
notifications  -- real-time bell notifications
wallets        -- balance per user (synced via trigger)
transactions   -- tips, ticket payments, withdrawals
```

Key patterns:
- Wallet balance is derived from transactions via a Postgres trigger — no drift possible
- Room `participant_count` is synced via trigger on `room_participants` INSERT/DELETE
- Room status (`scheduled → live → ended`) is flipped by `sync_room_statuses()` RPC

---

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project
- Agora account (App ID + Certificate)
- Anthropic API key

### Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_AGORA_APP_ID=
AGORA_APP_CERTIFICATE=
ANTHROPIC_API_KEY=
```

### Install and run

```bash
git clone https://github.com/NGONIE00/dare-mini-mvp
cd dare-mini-mvp
npm install
npm run dev
```

### Seed the database

Run `seed-fixed.sql` in your Supabase SQL Editor to create demo users and rooms, then run `fix-rls.sql` for RLS policies and storage buckets.

---

## Roadmap

- [ ] **Twilio SMS OTP** — replace email-based auth with real phone verification
- [ ] **USSD live integration** — connect `*447#` to NetOne / Econet USSD gateway
- [ ] **Offline-resilient buffering** — session audio cached locally for replay
- [ ] **20+ language support** — Shona, Ndebele, Swahili, Hausa, Amharic
- [ ] **USSD for hosts** — create and manage rooms via feature phone
- [ ] **Escrow & dispute resolution** — for ticketed session refunds

---

## Grant Applications

Dare is currently seeking funding from:

- **Mozilla Builders** — open source, digital inclusion alignment
- **Shuttleworth Foundation** — social innovation, open access
- **Indigo Trust** — digital rights, Global South infrastructure

Submitted to: **POTRAZ–NUST 2026 ICT Research Symposium**, Bulawayo · 1–4 September 2026

---

## Ethical Architecture

- **No ads** — the product is not the audience
- **No algorithmic manipulation** — rooms surface chronologically
- **Creator data sovereignty** — hosts own their follower relationships
- **85% revenue share** — creators keep the majority of every payment
- **Open source** — built to be studied, forked, and improved

---

## Author

**Ngonidzashe** · [@NGONIE00](https://github.com/NGONIE00)  
Building digital infrastructure for the communities that need it most.

---

*Dare means "community council" in Shona. Every voice deserves a seat.*
