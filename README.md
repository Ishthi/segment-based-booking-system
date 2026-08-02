# Segment-Based Booking System

A Rails 8 API with a React (Vite) frontend for booking train seats across route segments,
so one seat can be sold to different passengers on non-overlapping legs of the same journey.

## Running with Docker

The only requirement is Docker with Compose.

```bash
docker compose up --build
```

Then open **http://localhost:5173**.

The first run takes a few minutes — it installs gems and npm packages, creates the
database, loads the schema and seeds it. The frontend deliberately waits for the API's
health check, so once the page loads the data is ready.

| Service | URL | Notes |
| --- | --- | --- |
| Frontend | http://localhost:5173 | Vite dev server, hot reload enabled |
| API | http://localhost:3000 | Rails in development mode |
| Database | — | PostgreSQL 17, not published to the host |

Seed data: 6 stations (Colombo Fort → Kandy → Hatton → Nanu Oya → Ella → Badulla),
train `1005`, 8 coaches (3 reserved × 4 seats, 5 unreserved × 8 seats) and 52 seats.

### Everyday commands

```bash
docker compose up              # start (after the first build)
docker compose down            # stop, keeping the database
docker compose down -v         # stop and wipe the database; next start reseeds
docker compose logs -f api     # tail the Rails log
docker compose exec api bin/rails console
```

The repo is bind-mounted into both containers, so edits to Ruby or React source
reload live. Changing the `Gemfile` or `package.json` needs a rebuild:

```bash
docker compose build api    # or: docker compose build web
```

Seeding only runs when the database is empty, so restarting will not discard
bookings made through the UI.

### Ports already in use

If something on the host already holds 3000 or 5173, change the left-hand side of the
relevant `ports:` entry in `docker-compose.yml`. When changing the API port, also update
`VITE_API_BASE` on the `web` service — the browser calls the API directly, so it needs
the published port.

## Running without Docker

Requires Ruby 4.0.5, Node 24 and a local PostgreSQL 17.

```bash
bundle install
bin/rails db:prepare db:seed
bin/rails server                      # http://localhost:3000

cd frontend && npm install && npm run dev   # http://localhost:5173
```

## Layout

| Path | Purpose |
| --- | --- |
| `app/controllers/api/v1/` | JSON API — stations, trains, coaches, seats, availability, bookings |
| `app/services/` | Booking, seat availability, seat versioning and fare calculation |
| `frontend/src/App.tsx` | Admin console: stations, inventory, seat visualization, booking |
| `Dockerfile` | Production image (Kamal) |
| `Dockerfile.dev` | Development image used by `docker-compose.yml` |
