# syntax=docker/dockerfile:1

# Builder: compiles the Go backend. Override GO_VERSION if your toolchain
# differs from the one pinned in go.mod.
ARG GO_VERSION=1.27.1
FROM golang:${GO_VERSION}-bookworm AS builder

# go-sqlite3 uses cgo, so a C compiler is required to build the binary.
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libc6-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src

# Cache module downloads before copying the rest of the source.
COPY go.mod go.sum ./
RUN go mod download

COPY . .

ENV CGO_ENABLED=1
ENV GOTOOLCHAIN=auto
RUN go build -trimpath -ldflags="-s -w" -o /out/social-network .

# Runtime: small Debian image that can run the cgo binary (glibc).
FROM debian:bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /out/social-network /app/social-network
# Migrations are discovered and applied at boot by pkg/db/sqlite.
COPY --from=builder /src/pkg/db/migrations /app/pkg/db/migrations
RUN mkdir -p /app/media

# DB_PATH is configurable so the database can live on a mounted volume.
ENV DB_PATH=/data/social-network.db \
    FRONTEND_URL=http://localhost:3000

EXPOSE 8080

CMD ["/app/social-network"]
