CREATE TABLE IF NOT EXISTS users (
    id           SERIAL PRIMARY KEY,
    username     VARCHAR(50)  NOT NULL,
    email        VARCHAR(100) NOT NULL UNIQUE,
    password     TEXT         NOT NULL,
    points       INTEGER      DEFAULT 0,
    total_points INTEGER      DEFAULT 0,
    tier         VARCHAR(20)  DEFAULT 'Bronze',
    birthday     DATE,
    bookings     INTEGER      DEFAULT 0,
    created_at   TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS redemptions (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER      REFERENCES users(id) ON DELETE CASCADE,
    reward_name      VARCHAR(100) NOT NULL,
    points_deducted  INTEGER      NOT NULL,
    redemption_id    VARCHAR(50)  NOT NULL UNIQUE,
    used             BOOLEAN      DEFAULT FALSE,
    expires_at       TIMESTAMP    DEFAULT NOW() + INTERVAL '24 hours',
    created_at       TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservations (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER     REFERENCES users(id) ON DELETE CASCADE,
    date             DATE        NOT NULL,
    time             VARCHAR(20) NOT NULL,
    guests           INTEGER     NOT NULL,
    special_requests TEXT,
    status           VARCHAR(20) DEFAULT 'confirmed',
    created_at       TIMESTAMP   DEFAULT NOW(),
    updated_at       TIMESTAMP   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_verification (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email      VARCHAR(255) NOT NULL,
    code       VARCHAR(6)   NOT NULL,
    verified   BOOLEAN      DEFAULT FALSE,
    expires_at TIMESTAMP    DEFAULT NOW() + INTERVAL '15 minutes',
    created_at TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_number VARCHAR(20)  NOT NULL,
    items        JSONB        NOT NULL,
    total        NUMERIC(8,2) NOT NULL,
    status       VARCHAR(20)  DEFAULT 'preparing',
    pickup_time  VARCHAR(20),
    ready_at     TIMESTAMP,
    created_at   TIMESTAMP    DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_users_email                ON users(email);
CREATE INDEX IF NOT EXISTS idx_email_verification_user_id ON email_verification(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_code    ON email_verification(code);