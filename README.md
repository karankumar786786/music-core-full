graph TD
    Internet([🌐 Internet]) --> Caddy[Caddy Gateway\nSSL + Routing]

    subgraph Gateway
        Caddy[Caddy Gateway\nSSL + Routing]
    end

    Caddy -->|one-melody.one-org.me| Frontend
    Caddy -->|one-melody-admin.one-org.me| Admin
    Caddy -->|music-backend.one-org.me| Backend
    Caddy -->|audio-processor.one-org.me :3005| AudioProcessor
    Caddy -->|recommendation-engine.one-org.me :8000| RecommendationEngine

    subgraph Services
        Frontend[Frontend\nCaddy Static :80]
        Admin[Admin\nCaddy Static :80]
        Backend[Music Backend\nNestJS :3000 x2]
        AudioProcessor[Audio Processor\nTSX :3005]
        RecommendationEngine[Recommendation Engine\nFastAPI :8000]
    end

    Backend -->|http://recommendation-engine:8000| RecommendationEngine
    Backend -->|http://audio-processor:3005| AudioProcessor

    subgraph External
        Inngest([Inngest Cloud])
        Qdrant([Qdrant Cloud])
        Postgres([Aiven PostgreSQL])
        S3([AWS S3])
        Grafana([Grafana Loki])
    end

    Backend --> Postgres
    Backend --> S3
    Backend --> Grafana
    Backend --> Inngest
    AudioProcessor --> Postgres
    AudioProcessor --> S3
    AudioProcessor --> Inngest
    RecommendationEngine --> Qdrant
    RecommendationEngine --> Inngest