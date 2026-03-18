<p align="center">
  <img src="assets/phone-home1.jpeg" width="180" alt="OneMelody Home" />
  <img src="assets/phone-player1.jpeg" width="180" alt="OneMelody Player" />
  <img src="assets/phone-lyrics.jpeg" width="180" alt="OneMelody Lyrics" />
  <img src="assets/phone-search.jpeg" width="180" alt="OneMelody Search" />
</p>

<h1 align="center">🎵 OneMelody — music-core</h1>

<p align="center">
  <strong>Full-stack music streaming platform with AI-powered recommendations, HLS adaptive streaming, real-time audio processing, and cross-platform clients.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Docker_Swarm-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker Swarm" />
  <img src="https://img.shields.io/badge/AWS_S3-569A31?style=for-the-badge&logo=amazons3&logoColor=white" alt="AWS S3" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" alt="PyTorch" />
  <img src="https://img.shields.io/badge/Qdrant-FF6F61?style=for-the-badge&logo=data:image/svg+xml;base64,&logoColor=white" alt="Qdrant" />
</p>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Services](#-services)
- [Screenshots](#-screenshots)
  - [Mobile App (iOS/Android)](#-mobile-app-iosandroid)
  - [Web App](#-web-app)
  - [Admin Panel](#-admin-panel)
  - [Observability Dashboard](#-observability--monitoring)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [Audio Processing Pipeline](#-audio-processing-pipeline)
- [Recommendation Engine](#-recommendation-engine)
- [S3 Storage Structure](#-s3-storage-structure)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [CI/CD Pipeline](#-cicd-pipeline)
- [Internal Communication](#-internal-communication)
- [Useful Commands](#-useful-commands)
- [API Documentation](#-api-documentation)
- [Local Development](#-local-development)

---

## 🎯 Overview

**OneMelody** is a production-grade music streaming platform built as a distributed microservices architecture. It provides end-to-end functionality from admin song uploads with automated audio processing to personalized AI-driven recommendations for end users.

The platform features:
- **Adaptive HLS streaming** across multiple bitrates (32k, 64k, 128k)
- **AI-powered song recommendations** using vector embeddings and cosine similarity
- **Event-driven audio pipeline** via Inngest for transcoding, transcription, feature extraction, and embedding generation
- **Cross-platform clients** — React web app, React Native (Expo) mobile app for iOS & Android
- **Admin dashboard** for managing songs, artists, and playlists
- **Full observability** with Grafana Loki, OpenTelemetry traces, and Prometheus metrics

---

## ✨ Key Features

| Category | Features |
|----------|----------|
| **Streaming** | HLS adaptive bitrate streaming (32k/64k/128k), master playlist, gapless playback |
| **Audio Processing** | Automated transcoding via ffmpeg, image scaling (small/medium/large WebP), lyrics transcription via Sarvam AI |
| **Recommendations** | Sentence-transformer text embeddings + Essentia audio feature extraction → Qdrant vector DB, multi-seed interleaved similarity search |
| **User Features** | Registration/login (JWT), favourites, listening history, custom playlists, search (PostgreSQL trigram), profile management, password change |
| **Admin** | Song/artist/playlist CRUD with image uploads, processing job monitoring, bulk operations |
| **Search** | Full-text fuzzy search across songs, artists, playlists using PostgreSQL `pg_trgm` GIN indexes |
| **Infrastructure** | Docker Swarm orchestration, Caddy auto-SSL, zero-downtime rolling updates, GitHub Actions CI/CD |
| **Observability** | Grafana Loki log aggregation, OpenTelemetry distributed tracing, Prometheus metrics (`/metrics` endpoint) |

---

## 🏗 Architecture

```mermaid
graph TD
    Internet([🌐 Internet]) --> Caddy

    subgraph Gateway
        Caddy[Caddy Gateway\nSSL + Routing]
    end

    Caddy -->|one-melody.one-org.me| Frontend
    Caddy -->|one-melody-admin.one-org.me| Admin
    Caddy -->|music-backend.one-org.me| Backend
    Caddy -->|audio-processor.one-org.me| AudioProcessor
    Caddy -->|recommendation-engine.one-org.me| RecommendationEngine

    subgraph Services
        Frontend[Frontend\nReact + Vite\nCaddy Static :80]
        Admin[Admin Panel\nReact + Vite\nCaddy Static :80]
        Backend[Music Backend\nNestJS :3000 x2 replicas]
        AudioProcessor[Audio Processor\nNode.js + ffmpeg :3005]
        RecommendationEngine[Recommendation Engine\nFastAPI + PyTorch :8000]
    end

    Backend -->|REST| RecommendationEngine
    Backend -->|Events| AudioProcessor

    subgraph External Services
        Inngest([Inngest Cloud\nEvent Orchestration])
        Qdrant([Qdrant Cloud\nVector Database])
        Postgres([Aiven PostgreSQL\nRelational DB])
        S3([AWS S3\nObject Storage])
        Grafana([Grafana Cloud\nLoki + OTEL])
        Sarvam([Sarvam AI\nLyrics Transcription])
    end

    Backend --> Postgres
    Backend --> S3
    Backend --> Grafana
    Backend --> Inngest
    AudioProcessor --> Postgres
    AudioProcessor --> S3
    AudioProcessor --> Inngest
    AudioProcessor --> Sarvam
    RecommendationEngine --> Qdrant
    RecommendationEngine --> Inngest
    RecommendationEngine --> S3
```

### Deployment Architecture

<p align="center">
  <img src="assets/deployment.jpeg" width="600" alt="Deployment Architecture" />
</p>

> All services run on a single **AWS EC2 m7i-flex.large** instance orchestrated via **Docker Swarm** with a **Caddy** reverse proxy handling SSL termination and domain-based routing. Caddy automatically provisions and renews Let's Encrypt TLS certificates.

---

## 🔧 Services

| Service | Stack | Port | Domain | Replicas |
|---------|-------|------|--------|----------|
| `music-backend` | NestJS + Prisma + Swagger | 3000 | `music-backend.one-org.me` | 2 |
| `audio-processor` | Node.js + TSX + ffmpeg + sharp | 3005 | `audio-processor.one-org.me` | 1 |
| `recommendation-engine` | Python + FastAPI + PyTorch + Essentia | 8000 | `recommendation-engine.one-org.me` | 1 |
| `frontend` | React + Vite + TanStack Router (static) | 80 | `one-melody.one-org.me` | 1 |
| `admin` | React + Vite + TanStack Router (static) | 80 | `one-melody-admin.one-org.me` | 1 |
| `caddy` | Caddy 2 Alpine | 80/443 | Gateway + Auto-SSL | 1 |
| `mobile-app` | Expo (React Native) | — | Native iOS/Android | — |

---

## 📸 Screenshots

### 📱 Mobile App (iOS/Android)

<p align="center">
  <img src="assets/phone-home1.jpeg" width="200" alt="Home Screen 1" />
  <img src="assets/phone-home2.jpeg" width="200" alt="Home Screen 2" />
  <img src="assets/phone-search.jpeg" width="200" alt="Search" />
</p>
<p align="center"><em>Home Feed — Personalized recommendations and curated playlists | Search</em></p>

<p align="center">
  <img src="assets/phone-player1.jpeg" width="200" alt="Player View 1" />
  <img src="assets/phone-player2.jpeg" width="200" alt="Player View 2" />
  <img src="assets/phone-lyrics.jpeg" width="200" alt="Lyrics View" />
</p>
<p align="center"><em>Full-screen Player with album art | Synced Lyrics View</em></p>

<p align="center">
  <img src="assets/phone-favourites.jpeg" width="200" alt="Favourites" />
  <img src="assets/phone-artist-details.jpeg" width="200" alt="Artist Details" />
  <img src="assets/phne-user-profile.jpeg" width="200" alt="User Profile" />
</p>
<p align="center"><em>Favourites | Artist Details | User Profile</em></p>

<p align="center">
  <img src="assets/phone-user-playlist-detail.jpeg" width="200" alt="User Playlist Detail" />
  <img src="assets/phone-change-password.jpeg" width="200" alt="Change Password" />
</p>
<p align="center"><em>User Playlist Detail | Change Password</em></p>

---

### 🌐 Web App

<p align="center">
  <img src="assets/web-home1.jpeg" width="700" alt="Web Home" />
</p>
<p align="center"><em>Web Home — Featured playlists, trending songs, and personalized feed</em></p>

<p align="center">
  <img src="assets/web-playlist.png" width="700" alt="Web Playlists" />
</p>
<p align="center"><em>Browse Playlists</em></p>

<p align="center">
  <img src="assets/web-playlist-detail.png" width="700" alt="Web Playlist Detail" />
</p>
<p align="center"><em>Playlist Detail — Song listing with inline player controls</em></p>

<p align="center">
  <img src="assets/web-artist.png" width="700" alt="Web Artist Page" />
</p>
<p align="center"><em>Artist Page — Bio, banner, and discography</em></p>

<p align="center">
  <img src="assets/web-favourites.png" width="700" alt="Web Favourites" />
</p>
<p align="center"><em>User Favourites</em></p>

<p align="center">
  <img src="assets/web-history.png" width="700" alt="Web Listening History" />
</p>
<p align="center"><em>Listening History</em></p>

<p align="center">
  <img src="assets/web-playlists.png" width="700" alt="Web User Playlists" />
</p>
<p align="center"><em>User Playlists</em></p>

<p align="center">
  <img src="assets/web-userplaylit-detail.png" width="700" alt="Web User Playlist Detail" />
</p>
<p align="center"><em>User Playlist Detail</em></p>

---

### ⚙️ Admin Panel

<p align="center">
  <img src="assets/admin-pannel.png" width="700" alt="Admin Panel" />
</p>
<p align="center"><em>Admin Dashboard — Manage songs, artists, playlists with CRUD operations, upload forms, and processing job status</em></p>

---

### 📊 Observability & Monitoring

<p align="center">
  <img src="assets/observablity-main.png" width="700" alt="Observability Main Dashboard" />
</p>
<p align="center"><em>Grafana Main Dashboard — Service health overview</em></p>

<p align="center">
  <img src="assets/observablity-main-detail.png" width="700" alt="Observability Detail View" />
</p>
<p align="center"><em>Detailed Service Metrics</em></p>

<p align="center">
  <img src="assets/observablity-api-monitering.png" width="700" alt="API Monitoring" />
</p>
<p align="center"><em>API Endpoint Monitoring — Request rates, latencies, error rates</em></p>

<p align="center">
  <img src="assets/observablity-api-performance-plot.png" width="700" alt="API Performance Plot" />
</p>
<p align="center"><em>API Performance Plots — Response time distributions</em></p>

<p align="center">
  <img src="assets/observablity-audio-pipline.png" width="700" alt="Audio Pipeline Monitoring" />
</p>
<p align="center"><em>Audio Processing Pipeline Monitoring</em></p>

<p align="center">
  <img src="assets/observablity-pipline-function.png" width="700" alt="Pipeline Function Monitoring" />
</p>
<p align="center"><em>Inngest Pipeline Function Execution Monitoring</em></p>

---

## 📁 Project Structure

```
music-core/
├── music-backend/              # NestJS API server (primary backend)
│   ├── src/
│   │   ├── app.module.ts       # Root module with all feature imports
│   │   ├── main.ts             # Bootstrap with Swagger, Inngest, CORS, Pino
│   │   ├── telementry.ts       # OpenTelemetry SDK initialization
│   │   ├── auth/               # JWT authentication (register, login, guards)
│   │   ├── users/              # User management & profiles
│   │   ├── songs/              # Song CRUD, upload, presigned URLs
│   │   ├── artists/            # Artist CRUD & management
│   │   ├── playlists/          # Admin playlist management
│   │   ├── userplaylists/      # User-created playlists
│   │   ├── interaction/        # Favourites, listening history
│   │   ├── search/             # Fuzzy search (pg_trgm)
│   │   ├── feed/               # Personalized feed & recommendations
│   │   ├── storage/            # AWS S3 integration
│   │   ├── global/             # Shared Prisma & config providers
│   │   ├── common/             # Shared utilities, guards, interceptors
│   │   └── lib/                # Inngest client & functions
│   ├── prisma/
│   │   └── schema.prisma       # Database schema (12 models)
│   ├── Dockerfile              # Multi-stage build (builder + production)
│   └── package.json
│
├── audioProcessingServer/      # Audio processing microservice
│   ├── index.ts                # Express + Inngest server entry
│   ├── lib/
│   │   ├── helpers/
│   │   │   ├── audioProcessor/
│   │   │   │   ├── transcodeAudio/    # ffmpeg HLS transcoding (32k/64k/128k)
│   │   │   │   ├── transcribeAudio/   # Sarvam AI lyrics transcription
│   │   │   │   └── uploadTranscodedAudio/ # S3 upload of processed files
│   │   │   ├── imageProcessors/       # sharp image scaling (small/medium/large WebP)
│   │   │   ├── inngest/               # Event-driven function definitions
│   │   │   ├── prisma/                # Database client
│   │   │   ├── signature/             # Request signing
│   │   │   └── storage/               # S3 client
│   │   └── dtos/                      # Data transfer objects
│   ├── Dockerfile
│   └── package.json
│
├── reccomendationEngine/       # ML-powered recommendation service
│   ├── main.py                 # FastAPI app with /recommend endpoint
│   ├── lib/
│   │   ├── helpers/
│   │   │   ├── embeddings/
│   │   │   │   └── models.py          # sentence-transformers model loaders
│   │   │   ├── audio_processing/      # Essentia audio feature extraction
│   │   │   ├── qdrant/                # Qdrant vector DB client & collection mgmt
│   │   │   ├── inngest/               # Embedding generation event handlers
│   │   │   ├── storage/               # S3 client (boto3)
│   │   │   └── config.py              # Environment & constants
│   │   └── dtos/                      # Pydantic request/response models
│   ├── Dockerfile                     # Python 3.12 + uv package manager
│   └── pyproject.toml
│
├── music-frontend-web/         # Web frontend (user-facing)
│   ├── src/
│   │   ├── routes/             # TanStack Router file-based routes
│   │   │   ├── index.tsx               # Home / feed page
│   │   │   ├── search.index.tsx        # Search page
│   │   │   ├── artists.index.tsx       # Artists listing
│   │   │   ├── artists.$artistId.tsx   # Artist detail page
│   │   │   ├── playlists.index.tsx     # Playlists browse
│   │   │   ├── playlists.$playlistId.tsx # Playlist detail
│   │   │   ├── user-playlists.index.tsx  # User's playlists
│   │   │   ├── user-playlists.$playlistId.tsx # User playlist detail
│   │   │   ├── favourites.tsx          # Favourites page
│   │   │   ├── history.tsx             # Listening history
│   │   │   └── profile.tsx             # User profile & settings
│   │   ├── components/         # Reusable UI components (shadcn/ui)
│   │   ├── Store/              # TanStack Store state management
│   │   └── lib/                # API client, utilities
│   ├── Dockerfile              # Multi-stage: build + Caddy static serve
│   └── package.json
│
├── music-backend-admin-web/    # Admin panel (content management)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── index.tsx               # Admin dashboard
│   │   │   ├── songs.index.tsx         # Songs management
│   │   │   ├── songs.create.tsx        # Song upload form
│   │   │   ├── artists.index.tsx       # Artists management
│   │   │   ├── artists.$artistId.tsx   # Artist edit
│   │   │   ├── playlists.index.tsx     # Playlists management
│   │   │   └── playlists.$playlistId.tsx # Playlist edit
│   │   ├── components/         # Admin UI components (shadcn/ui)
│   │   ├── hooks/              # Custom React hooks
│   │   └── Store/              # State management
│   ├── Dockerfile
│   └── package.json
│
├── my-expo-app/                # Mobile app (iOS & Android)
│   ├── app/
│   │   ├── (tabs)/             # Tab-based navigation
│   │   │   ├── home.tsx                # Home feed
│   │   │   ├── search.tsx              # Search
│   │   │   ├── favourites.tsx          # Favourites
│   │   │   ├── userPlaylists.tsx       # User playlists
│   │   │   └── profile.tsx             # Profile & settings
│   │   ├── player.tsx                  # Full-screen music player
│   │   ├── lyrics.tsx                  # Lyrics display
│   │   ├── history.tsx                 # Listening history
│   │   ├── artist/                     # Artist detail screens
│   │   ├── playlist/                   # Playlist detail screens
│   │   └── userplaylist/               # User playlist screens
│   ├── components/             # Shared RN components
│   ├── lib/                    # API client, utilities
│   └── app.json                # Expo config (com.oneorg6969.onemelody)
│
├── android-app/                # Android prebuild output
├── ios-app/                    # iOS prebuild output
├── assets/                     # Screenshots & documentation images
│
├── docker-compose.yml          # Docker Swarm stack definition
├── Caddyfile                   # Reverse proxy routing rules
├── storage-keys-documentation.txt  # S3 key structure docs
└── .github/
    └── workflows/
        └── build-docker.yml    # CI/CD: GitHub Actions → Docker Hub
```

---

## 🗃 Database Schema

The platform uses **PostgreSQL** (hosted on Aiven) with **Prisma ORM**. The schema leverages PostgreSQL extensions (`pg_trgm` for fuzzy text search with GIN indexes).

```mermaid
erDiagram
    User ||--o{ UserPlaylist : creates
    User ||--o{ UserSearchHistory : searches
    User ||--o{ UserHistory : "listens to"
    User ||--o{ UserFavourites : favourites

    Song ||--o{ PlaylistSongs : "belongs to"
    Song ||--o{ UserPlaylistSongs : "added to"
    Song ||--o{ UserHistory : "played by"
    Song ||--o{ UserFavourites : "liked by"

    Playlist ||--o{ PlaylistSongs : contains

    UserPlaylist ||--o{ UserPlaylistSongs : contains

    User {
        int id PK
        string email UK
        string password
        string name
        string profilePictureKey
        datetime createdAt
        datetime updatedAt
    }

    Song {
        string id PK
        string title
        string artistName
        int durationMs
        string storageKey
        datetime releaseDate
        string isrc
        string genre
        string vectorId UK
    }

    Artist {
        string id PK
        string artistName
        string bio
        string storageKey
        datetime dob
    }

    Playlist {
        string id PK
        string title
        string description
        string storageKey
    }

    UserPlaylist {
        string id PK
        string title
        int userId FK
    }

    SongProcessingJob {
        string id PK
        string songId UK
        string title
        string artistName
        int durationMs
        string tempSongKey
        string tempSongImageKey
        string processedKey
        boolean transcribed
        boolean transcoded
        boolean extractedAudioFeatures
        boolean generatedEmbeddings
        boolean processedImages
        boolean completed
        string currentStatus
    }

    ArtistProcessingJob {
        string id PK
        string artistName
        string tempCoverImageKey
        string tempBannerImageKey
        string processedKey
        boolean scaledImage
    }

    PlaylistProcessingJob {
        string id PK
        string title
        string description
        string tempCoverImageKey
        string tempBannerImageKey
        string processedKey
        boolean scaledImage
    }

    UserFavourites {
        int id PK
        int userId FK
        string songId FK
    }

    UserHistory {
        int id PK
        int userId FK
        string songId FK
        string songVectorId
    }
```

### Key Design Decisions

- **Trigram Indexes**: `Song.title`, `Song.artistName`, `Song.genre`, `Artist.artistName`, `Playlist.title`, and `Playlist.description` all use PostgreSQL `pg_trgm` GIN indexes for fast fuzzy/substring search
- **Vector IDs**: Each song has a unique `vectorId` that maps to its embedding in the Qdrant vector database
- **Processing Jobs**: Separate `SongProcessingJob`, `ArtistProcessingJob`, and `PlaylistProcessingJob` tables track multi-stage async processing with retry counters and stage flags
- **Soft Linking**: Songs reference `artistName` as a string field rather than a foreign key, allowing flexible data modeling

---

## 🔊 Audio Processing Pipeline

When a song is uploaded through the admin panel, it triggers an event-driven processing pipeline orchestrated by **Inngest**:

```mermaid
sequenceDiagram
    participant Admin as Admin Panel
    participant Backend as NestJS Backend
    participant S3Temp as S3 (Temp Bucket)
    participant Inngest as Inngest Cloud
    participant AudioProc as Audio Processor
    participant S3Prod as S3 (Production Bucket)
    participant RecEngine as Recommendation Engine
    participant Qdrant as Qdrant Vector DB

    Admin->>Backend: Upload song (audio + cover image)
    Backend->>S3Temp: Store raw files
    Backend->>Backend: Create SongProcessingJob
    Backend->>Inngest: Emit "song.uploaded" event

    par Step 1: Transcode Audio
        Inngest->>AudioProc: Trigger transcode
        AudioProc->>S3Temp: Download raw audio
        AudioProc->>AudioProc: ffmpeg → HLS (32k/64k/128k + master.m3u8)
        AudioProc->>S3Prod: Upload HLS segments
        AudioProc->>AudioProc: Mark "transcoded = true"
    and Step 2: Process Cover Images
        Inngest->>AudioProc: Trigger image processing
        AudioProc->>S3Temp: Download raw image
        AudioProc->>AudioProc: sharp → original.png + small/medium/large.webp
        AudioProc->>S3Prod: Upload processed images
        AudioProc->>AudioProc: Mark "processedImages = true"
    and Step 3: Transcribe Lyrics
        Inngest->>AudioProc: Trigger transcription
        AudioProc->>S3Temp: Download raw audio
        AudioProc->>Sarvam AI: Send for transcription
        AudioProc->>AudioProc: Mark "transcribed = true"
    end

    par Step 4: Extract Audio Features
        Inngest->>RecEngine: Trigger feature extraction
        RecEngine->>S3Prod: Download processed audio
        RecEngine->>RecEngine: Essentia → audio features
        RecEngine->>RecEngine: Mark "extractedAudioFeatures = true"
    and Step 5: Generate Embeddings
        Inngest->>RecEngine: Trigger embedding generation
        RecEngine->>RecEngine: sentence-transformers → text embedding
        RecEngine->>RecEngine: Combine text + audio embeddings
        RecEngine->>Qdrant: Upsert vector embedding
        RecEngine->>RecEngine: Mark "generatedEmbeddings = true"
    end

    AudioProc->>Backend: Update Song record with storageKey
    Note over Backend: Song is now streamable & searchable
```

### HLS Streaming Structure

<p align="center">
  <img src="assets/hls.png" width="300" alt="HLS Structure" />
</p>

Each processed song produces the following HLS structure:

```
songs/<jobId>/
├── master.m3u8        # Master playlist (adaptive bitrate selector)
├── 32k/               # Low quality (32 kbps)
│   ├── playlist.m3u8
│   └── segment_*.ts
├── 64k/               # Medium quality (64 kbps)
│   ├── playlist.m3u8
│   └── segment_*.ts
└── 128k/              # High quality (128 kbps)
    ├── playlist.m3u8
    └── segment_*.ts
```

The frontend uses **hls.js** (web) and **expo-video** (mobile) to play the `master.m3u8` and automatically switch quality based on network conditions.

---

## 🤖 Recommendation Engine

The recommendation system uses a hybrid approach combining **text embeddings** and **audio features** for high-quality music recommendations.

### How It Works

```mermaid
graph LR
    A[Song Metadata\ntitle, artist, genre] --> B[sentence-transformers\nText Embedding]
    C[Audio File] --> D[Essentia\nAudio Feature Extraction]
    B --> E[Combined Vector]
    D --> E
    E --> F[Qdrant\nVector Database]

    G[User History\nfavourites + plays] --> H[Select Seed Tracks\nweighted random sampling]
    H --> I[Multi-Seed Query\nQdrant similarity search]
    I --> J[Interleave Results\nround-robin from seeds]
    J --> K[Score Threshold Filter\n≥ 0.3 cosine similarity]
    K --> L[Diversity Shuffle\ntop 70% fixed + bottom 30% shuffled]
    L --> M[Return Song IDs]
```

### Recommendation Algorithm

1. **Signal Weighting**: Takes `positiveSignals` (liked/played songs with weights) from user history
2. **Seed Selection**: Randomly samples up to 3 seed tracks, weighted by interaction strength
3. **Multi-Query**: Runs separate Qdrant similarity searches per seed for diversity
4. **Interleaving**: Merges results round-robin (A₁, B₁, C₁, A₂, B₂, C₂...) to balance coverage
5. **Score Filtering**: Removes results below the 0.3 cosine similarity threshold
6. **Diversity**: Keeps top 70% deterministically ordered, shuffles the bottom 30%

### Tech Details

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Text Embeddings | `sentence-transformers` | Encode song metadata (title, artist, genre) |
| Audio Features | `Essentia` | Extract MFCCs, spectral features, rhythm patterns |
| Vector DB | `Qdrant Cloud` | Store & query high-dimensional embeddings |
| Framework | `FastAPI` | Serve `/recommend` REST endpoint |
| ML Runtime | `PyTorch (CPU)` | Run inference for embedding models |

---

## 📦 S3 Storage Structure

The platform uses two S3 buckets — a **temp** bucket for raw uploads and a **production** bucket for processed, optimized files.

### Processed File Structure

<p align="center">
  <img src="assets/processed-file-structure.png" width="500" alt="S3 Processed File Structure" />
</p>

### 1. Songs

Songs involve two separate upload flows: the audio file and its cover image. Both are linked together in the database, but they are stored under different S3 prefixes in production.

**Database Record:**
- `id`: `<songUuid>`
- `storageKey`: `songs/<jobId>` (This is the "audio" storage key prefix returned by the processing job)

```
# Temp Upload (Before Processing)
s3://onemelodytemp/<uuid>-<filename.mp3>        # Raw audio (Saved as tempSongKey)
s3://onemelodytemp/<uuid>-<filename.png>        # Raw cover image (Saved as tempSongImageKey)

# Production Storage (After Processing)
s3://onemelodyproduction/songs/<jobId>/
├── master.m3u8                                 # HLS master playlist
├── 32k/  64k/  128k/                          # HLS segments per quality

s3://onemelodyproduction/song-cover-images/<jobId>/cover/
├── original.png                                # Full resolution
├── small.webp                                  # Thumbnail
├── medium.webp                                 # Card size
└── large.webp                                  # Full display
```

> **Frontend URL Resolution**: To display a song cover, take the DB `storageKey` (`songs/<jobId>`), change the prefix to `song-cover-images/`, and append `/cover/small.webp` (or `medium.webp`, `large.webp`).

### 2. Artists

Artists involve a cover image (avatar) and a banner image.

**Database Record:**
- `id`: `<artistUuid>`
- `storageKey`: `artists/<jobId>`

```
# Temp Upload (Before Processing)
s3://onemelodytemp/<uuid>-<filename.png>        # Raw cover image (Saved as tempCoverImageKey)
s3://onemelodytemp/<uuid>-<filename.png>        # Raw banner image (Saved as tempBannerImageKey)

# Production Storage (After Processing)
s3://onemelodyproduction/artists/<jobId>/
├── cover/
│   ├── original.png | small.webp | medium.webp | large.webp
└── banner/
    ├── original.png | small.webp | medium.webp | large.webp
```

### 3. Playlists

Playlists follow the exact same structure as Artists, but under the `playlists/` prefix.

**Database Record:**
- `id`: `<playlistUuid>`
- `storageKey`: `playlists/<jobId>`

```
# Temp Upload (Before Processing)
s3://onemelodytemp/<uuid>-<filename.png>        # Raw cover image (Saved as tempCoverImageKey)
s3://onemelodytemp/<uuid>-<filename.png>        # Raw banner image (Saved as tempBannerImageKey)

# Production Storage (After Processing)
s3://onemelodyproduction/playlists/<jobId>/
├── cover/
│   ├── original.png | small.webp | medium.webp | large.webp
└── banner/
    ├── original.png | small.webp | medium.webp | large.webp
```

---

## 🛠 Tech Stack

### Backend & Infrastructure

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **API Server** | NestJS 11 | REST API framework with modules, guards, pipes |
| **ORM** | Prisma 7 | Type-safe database client with migrations |
| **Database** | PostgreSQL (Aiven) | Primary data store with `pg_trgm` extension |
| **Auth** | Passport.js + JWT | Token-based authentication |
| **Validation** | Zod + nestjs-zod | Schema-based request validation |
| **API Docs** | Swagger / OpenAPI | Auto-generated at `/api` |
| **Storage** | AWS S3 | Object storage for audio & images |
| **Image Processing** | sharp | Resize & convert images to WebP |
| **Audio Processing** | ffmpeg | Transcode to HLS adaptive streaming |
| **Lyrics** | Sarvam AI | Audio transcription for lyrics |
| **Events** | Inngest | Durable event-driven function orchestration |
| **Metrics** | Prometheus (prom-client) | Application metrics at `/metrics` |
| **Logging** | Pino + pino-loki | Structured JSON logs → Grafana Loki |
| **Tracing** | OpenTelemetry | Distributed tracing → Grafana Tempo |
| **Container** | Docker + Docker Swarm | Orchestration & networking |
| **Reverse Proxy** | Caddy 2 | Auto-SSL, routing, load balancing |
| **CI/CD** | GitHub Actions | Build & push images to Docker Hub |

### ML & Recommendations

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | FastAPI | High-performance Python API |
| **Embeddings** | sentence-transformers | Text-to-vector encoding |
| **Audio Analysis** | Essentia 2.1 | Audio feature extraction |
| **ML Runtime** | PyTorch (CPU) | Model inference |
| **Vector DB** | Qdrant Cloud | Nearest-neighbor vector search |
| **Package Manager** | uv | Fast Python package management |

### Frontend & Mobile

| Platform | Technology | Key Libraries |
|----------|-----------|---------------|
| **Web** | React 19 + Vite 7 | TanStack Router, TanStack Query, shadcn/ui, hls.js, Tailwind CSS 4, Lucide icons, Sonner toasts |
| **Admin** | React 19 + Vite 7 | TanStack Router, TanStack Query, shadcn/ui, React Hook Form, Zod |
| **Mobile** | Expo 54 (React Native 0.81) | Expo Router, expo-av, expo-video, NativeWind, React Reanimated, Gesture Handler, Expo Blur, Linear Gradient |

---

## ⚡ Prerequisites

- **Docker** with Swarm mode enabled
- **AWS EC2** instance (m7i-flex.large or similar with ≥2 vCPUs, ≥8GB RAM recommended)
- **Domain** with DNS A records pointing to EC2 IP
- **Docker Hub** account for image registry
- **Aiven PostgreSQL** account (or any PostgreSQL 15+)
- **AWS S3** with two buckets (`onemelodytemp`, `onemelodyproduction`)
- **Qdrant Cloud** account for vector database
- **Inngest Cloud** account for event orchestration
- **Grafana Cloud** (optional) for observability

---

## 🔐 Environment Variables

Each service requires its own `.env` file. Create them on the server after cloning.

### `music-backend/.env`

```env
# Database
POSTGRESS_DATABASE_HOST=         # Aiven PostgreSQL host
POSTGRESS_DATABASE_PORT=         # Usually 12073
POSTGRESS_DATABASE_USER=         # Database username
POSTGRESS_DATABASE_PASSWORD=     # Database password
POSTGRESS_DATABASE_NAME=         # Database name
DATABASE_URL=                    # Full Prisma connection string

# AWS S3
AWS_ACCESS_KEY=                  # IAM access key
AWS_SECRET_KEY=                  # IAM secret key
AWS_TEMP_BUCKET=                 # e.g. onemelodytemp
AWS_PRODUCTION_BUCKET=           # e.g. onemelodyproduction

# Qdrant Vector DB
QUADRANT_DB_API_KEY=             # Qdrant Cloud API key
QUADRANT_DB_ENDPOINT=            # Qdrant Cloud endpoint URL

# Auth
JWT_SECRET=                      # Secret for JWT token signing

# Internal Service URLs
RECOMMENDATION_ENGINE_URL=http://recommendation-engine:8000
AUDIO_PROCESSOR_URL=http://audio-processor:3005

# Server
PORT=3000
NODE_ENV=production

# Inngest (Event Orchestration)
INNGEST_EVENT_KEY=               # Inngest event key
INNGEST_SIGNING_KEY=             # Inngest webhook signing key

# Observability
LOKI_HOST=                       # Grafana Loki push endpoint
LOKI_USERNAME=                   # Loki basic auth user
LOKI_PASSWORD=                   # Loki basic auth password
OTEL_EXPORTER_OTLP_ENDPOINT=    # OTLP trace collector endpoint
OTEL_SERVICE_NAME=               # e.g. music-backend
```

### `audioProcessingServer/.env`

```env
# Database (same as backend)
POSTGRESS_DATABASE_HOST=
POSTGRESS_DATABASE_PORT=
POSTGRESS_DATABASE_USER=
POSTGRESS_DATABASE_PASSWORD=
POSTGRESS_DATABASE_NAME=
DATABASE_URL=

# AWS S3
AWS_ACCESS_KEY=
AWS_SECRET_KEY=
AWS_TEMP_BUCKET=
AWS_PRODUCTION_BUCKET=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
NODE_ENV=production
INNGEST_DEV=0
```

### `reccomendationEngine/.env`

```env
# Qdrant Vector DB
QUADRANT_DB_API_KEY=
QUADRANT_DB_ENDPOINT=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
INNGEST_DEV=0
```

---

## 🚀 Deployment

### 1. Clone the Repository

```bash
git clone https://github.com/karankumar786786/music-core-full.git
cd music-core-full
```

### 2. Create Environment Files

```bash
nano music-backend/.env
nano audioProcessingServer/.env
nano reccomendationEngine/.env
```

### 3. Initialize Docker Swarm

```bash
docker swarm init --advertise-addr YOUR_EC2_IP
```

### 4. Deploy the Stack

```bash
docker stack deploy -c docker-compose.yml music-core
```

### 5. Verify Deployment

```bash
watch -n 2 'docker stack services music-core'
```

All services should show `1/1` (or `2/2` for music-backend) replicas within a few minutes. Caddy automatically provisions SSL certificates via Let's Encrypt.

### 6. DNS Setup

Add these A records in your DNS provider pointing to your EC2 IP:

| Subdomain | Record Type | Value |
|-----------|-------------|-------|
| `music-backend.one-org.me` | A | `YOUR_EC2_IP` |
| `audio-processor.one-org.me` | A | `YOUR_EC2_IP` |
| `recommendation-engine.one-org.me` | A | `YOUR_EC2_IP` |
| `one-melody.one-org.me` | A | `YOUR_EC2_IP` |
| `one-melody-admin.one-org.me` | A | `YOUR_EC2_IP` |

### Docker Compose Configuration

The `docker-compose.yml` defines a robust Docker Swarm stack configuration for resilient deployments:

| Service | Image | Replicas | Update Strategy |
|---------|-------|----------|-----------------|
| `caddy` | `caddy:2-alpine` | 1 (manager only) | On failure restart |
| `music-backend` | `oneorg6969/music-backend:latest` | **2** | Rolling (start-first, 10s delay) |
| `audio-processor` | `oneorg6969/audio-processor:latest` | 1 | Rolling (start-first, 10s delay) |
| `recommendation-engine` | `oneorg6969/recommendation-engine:latest` | 1 | Rolling (start-first, 10s delay) |
| `frontend` | `oneorg6969/frontend:latest` | 1 | On failure restart |
| `admin` | `oneorg6969/admin:latest` | 1 | On failure restart |

#### Swarm Volumes, Networking, & Architecture Details
- **Volumes**: Caddy relies on `caddy_data` and `caddy_config` named volumes to persist automatically provisioned Let's Encrypt TLS certificates, preventing rate limits on restarts. It also locally mounts `./Caddyfile` for routing rules.
- **Networking**: All services sit on the `music-core-network` initialized with the `overlay` driver. This enables secure inter-container communication across the swarm without needing to expose internal ports externally to the public internet (except Caddy's 80/443 mapping).
- **Placement**: The `caddy` container is constrained via `node.role == manager` to ensure it only runs on the manager node.
- **Zero-Downtime Deployments**: Core services (`music-backend`, `audio-processor`, `recommendation-engine`) use a rolling update config (`parallelism: 1`, `delay: 10s`, `order: start-first`). This ensures the orchestrator spins up the new healthy container *before* shutting down the old one.

---

## 🔄 CI/CD Pipeline

GitHub Actions workflow at `.github/workflows/build-docker.yml` builds Docker images and pushes to Docker Hub.

### Trigger

**Manual dispatch** from GitHub Actions tab → "Build and Push to Docker Hub" → Run workflow

### Inputs

| Input | Type | Options | Description |
|-------|------|---------|-------------|
| `service` | choice | `all`, `music-backend`, `audio-processor`, `recommendation-engine`, `frontend`, `admin` | Which service(s) to build |
| `version` | string | e.g. `1.0.0` | Semantic version tag |

### Build Matrix

```mermaid
graph LR
    A[GitHub Actions Trigger] --> B{Service Selection}
    B -->|music-backend| C[Build ./music-backend\nMulti-stage Node.js]
    B -->|audio-processor| D[Build ./audioProcessingServer\nNode.js + ffmpeg]
    B -->|recommendation-engine| E[Build ./reccomendationEngine\nPython 3.12 + uv]
    B -->|frontend| F[Build ./music-frontend-web\nNode.js → Caddy static]
    B -->|admin| G[Build ./music-backend-admin-web\nNode.js → Caddy static]
    B -->|all| C & D & E & F & G
    C & D & E & F & G --> H[Push to Docker Hub\ntag: version + latest]
```

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `VITE_API_BASE_URL` | Backend API URL for frontend builds |

### Features

- **Docker Buildx** for efficient multi-platform builds
- **GitHub Actions Cache** (`type=gha`) for layer caching across builds
- **Dual tagging**: Each build is tagged with both the version (e.g. `1.0.0`) and `latest`
- **Selective builds**: Build individual services or all at once

---

## 🔗 Internal Communication

Services communicate internally via Docker overlay network (`music-core-network`) using service names as hostnames:

```
┌─────────────────────────────────────────────────────────────┐
│                  Docker Overlay Network                      │
│                  (music-core-network)                        │
│                                                             │
│  music-backend ──────── http://recommendation-engine:8000   │
│  music-backend ──────── http://audio-processor:3005         │
│  caddy ─────────────── http://music-backend:3000            │
│  caddy ─────────────── http://frontend:80                   │
│  caddy ─────────────── http://admin:80                      │
│  caddy ─────────────── http://audio-processor:3005          │
│  caddy ─────────────── http://recommendation-engine:8000    │
└─────────────────────────────────────────────────────────────┘
```

> **Note**: Browser/frontend calls always go through the **public domain** since SPAs run in the browser, not on the server. Only backend-to-backend calls use internal Docker networking.

---

## 📝 Useful Commands

```bash
# ── Service Management ───────────────────────────────────────
docker stack services music-core              # View all services & replicas
docker stack ps music-core                    # View all running tasks
docker service logs music-core_music-backend -f  # Stream backend logs
docker service logs music-core_caddy -f       # Stream Caddy logs

# ── Scaling ──────────────────────────────────────────────────
docker service scale music-core_music-backend=3  # Scale backend to 3 replicas

# ── Updates (zero-downtime) ──────────────────────────────────
docker service update --force --image oneorg6969/music-backend:1.2.0 music-core_music-backend
docker service update --force --image oneorg6969/frontend:1.2.0 music-core_frontend

# ── Stack Management ────────────────────────────────────────
docker stack rm music-core                    # Remove entire stack
docker stack deploy -c docker-compose.yml music-core  # Redeploy

# ── Cleanup ─────────────────────────────────────────────────
docker system prune -a -f                     # Remove unused images/containers
docker volume prune -f                        # Remove unused volumes
```

---

## 📖 API Documentation

The NestJS backend auto-generates **Swagger/OpenAPI** documentation:

- **URL**: `https://music-backend.one-org.me/api`
- **Auth**: Bearer token (JWT) — login via `/auth/login` to get token

### Core API Modules

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Auth** | `POST /auth/register`, `POST /auth/login` | User registration & JWT login |
| **Users** | `GET /users/me`, `PATCH /users/me` | Profile management |
| **Songs** | `GET /songs`, `POST /songs`, `GET /songs/:id` | Song CRUD & upload |
| **Artists** | `GET /artists`, `POST /artists`, `GET /artists/:id` | Artist management |
| **Playlists** | `GET /playlists`, `POST /playlists` | Admin playlist management |
| **User Playlists** | `GET /userplaylists`, `POST /userplaylists` | User-created playlists |
| **Interaction** | `POST /interaction/favourite`, `POST /interaction/history` | Favourites & listening history |
| **Search** | `GET /search?q=...` | Fuzzy search across songs, artists, playlists |
| **Feed** | `GET /feed` | Personalized recommendation feed |
| **Storage** | `GET /storage/presigned-url` | Generate S3 presigned upload URLs |

---

## 💻 Local Development

### Backend (NestJS)

```bash
cd music-backend
cp .env.example .env              # Configure your environment
pnpm install                      # Install dependencies
npx prisma generate               # Generate Prisma client
npx prisma db push                # Sync schema to DB
pnpm run dev                      # Start dev server (watch mode) → http://localhost:3000
pnpm run inngest                  # Start Inngest dev server (for all 3 services)
```

### Audio Processor

```bash
cd audioProcessingServer
cp .env.example .env
pnpm install
npx prisma generate
pnpm run dev                      # Start with hot-reload → http://localhost:3005
```

### Recommendation Engine

```bash
cd reccomendationEngine
cp .env.example .env
uv sync                           # Install Python dependencies
uv run uvicorn main:app --reload --port 8000  # Start dev server → http://localhost:8000
```

### Web Frontend

```bash
cd music-frontend-web
pnpm install
pnpm run dev                      # Start Vite dev server → http://localhost:5173
```

### Admin Panel

```bash
cd music-backend-admin-web
pnpm install
pnpm run dev                      # Start Vite dev server → http://localhost:5174
```

### Mobile App (Expo)

```bash
cd my-expo-app
bun install                       # Install dependencies (uses Bun)
bun run start                     # Start Expo dev server
bun run android                   # Run on Android emulator/device
bun run ios                       # Run on iOS simulator/device
```

---

## 📄 License

This project is **UNLICENSED** — private/proprietary.

---

<p align="center">
  Built with ❤️ by <strong>OneMelody Team</strong>
</p>