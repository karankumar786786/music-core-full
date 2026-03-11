-- Global search function: single DB call, returns typed union of Song/Artist/Playlist matches
-- Pagination applies to the COMBINED result, not per-entity
CREATE OR REPLACE FUNCTION public.global_search(
    search_term text,
    similarity_threshold float DEFAULT 0.2,
    result_limit int DEFAULT 10,
    result_offset int DEFAULT 0
)
RETURNS TABLE (
    entity_type text,
    id text,
    title text,
    "artistName" text,
    genre text,
    "durationMs" int,
    "releaseDate" timestamptz,
    "storageKey" text,
    bio text,
    dob timestamptz,
    description text,
    score float
)
LANGUAGE sql STABLE
AS $$
    -- Guard: return nothing for very short search terms
    SELECT * FROM (
        SELECT * FROM (
            -- Songs
            (
                SELECT
                    'song'::text AS entity_type,
                    s.id::text,
                    s.title,
                    s."artistName",
                    s.genre,
                    s."durationMs",
                    s."releaseDate",
                    s."storageKey",
                    NULL::text         AS bio,
                    NULL::timestamptz  AS dob,
                    NULL::text         AS description,
                    GREATEST(
                        public.similarity(s.title,        search_term),
                        public.similarity(s."artistName", search_term),
                        public.similarity(s.genre,        search_term),
                        public.word_similarity(search_term, s.title),
                        public.word_similarity(search_term, s."artistName")
                    )::float AS score
                FROM "Song" s
                WHERE
                    s.title        % search_term
                    OR s."artistName" % search_term
                    OR s.genre        % search_term
                    OR search_term <% s.title
                    OR search_term <% s."artistName"
            )

            UNION ALL

            -- Artists
            (
                SELECT
                    'artist'::text AS entity_type,
                    a.id::text,
                    NULL::text         AS title,
                    a."artistName",
                    NULL::text         AS genre,
                    NULL::int          AS "durationMs",
                    NULL::timestamptz  AS "releaseDate",
                    a."storageKey",
                    a.bio,
                    a.dob,
                    NULL::text         AS description,
                    GREATEST(
                        public.similarity(a."artistName", search_term),
                        public.word_similarity(search_term, a."artistName")
                    )::float AS score
                FROM "Artist" a
                WHERE
                    a."artistName" % search_term
                    OR search_term <% a."artistName"
            )

            UNION ALL

            -- Playlists
            (
                SELECT
                    'playlist'::text AS entity_type,
                    p.id::text,
                    p.title,
                    NULL::text         AS "artistName",
                    NULL::text         AS genre,
                    NULL::int          AS "durationMs",
                    NULL::timestamptz  AS "releaseDate",
                    p."storageKey",
                    NULL::text         AS bio,
                    NULL::timestamptz  AS dob,
                    p.description,
                    GREATEST(
                        public.similarity(p.title,       search_term),
                        public.similarity(p.description, search_term),
                        public.word_similarity(search_term, p.title)
                    )::float AS score
                FROM "Playlist" p
                WHERE
                    p.title       % search_term
                    OR p.description % search_term
                    OR search_term <% p.title
            )
        ) combined
        WHERE combined.score > similarity_threshold
        ORDER BY combined.score DESC
        LIMIT result_limit OFFSET result_offset
    ) results
    WHERE length(search_term) >= 3;
$$;
