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

### Ports already in use

If something on the host already holds 3000 or 5173, change the left-hand side of the
relevant `ports:` entry in `docker-compose.yml`. When changing the API port, also update
`VITE_API_BASE` on the `web` service — the browser calls the API directly, so it needs
the published port.

## Using the system

Open **http://localhost:5173**. The sidebar has four sections, listed in the order
you would normally use them.

### 1. Stations

CRUD for the stops on the line. Two fields matter beyond the name:

- **Sequence** — position along the route. This defines what "forward" means, so a
  destination must always have a higher sequence than the origin.
- **Distance km** — cumulative distance from the start of the line. This is the only
  input to the fare (see below).

### 2. Trains / Coaches / Seats

Build the inventory, in that order: create a train, open it, add coaches, then add
seats to a coach. Each coach is either **reserved** (seats are individually
bookable) or **unreserved** (standing is allowed once seats run out).

### 3. Seat Visualization

Read-only view of who is sitting where. Pick a train, then a travel date, origin and
destination — all four are needed, because a seat is only "booked" with respect to a
specific journey on a specific day.

Two tiles then summarise the train: **Reserved** (blue) and **Unreserved** (green),
each showing free seats out of total. Click a tile to expand a seat map for every
coach of that type:

- **Blue / green seat** — free for the selected segment
- **Red seat** — already booked on a leg that overlaps the selected segment

### 4. Booking Create

1. Choose train, travel date, origin and destination. The destination list only
   offers stations further along the route than the origin.
2. Enter the passenger name.
3. Press **Load available seats** — this queries live availability for that segment.
4. Click the **Reserved** or **Unreserved** tile.
5. Pick a seat. Required for reserved coaches; optional for unreserved, where leaving
   it blank books a standing ticket.
6. Press **Create booking**. On success the form resets for the next passenger.

### Why a seat can be sold twice

Bookings are stored against a segment range (`segment_range`), not the whole journey.
Two passengers can hold the *same seat on the same train and date* as long as their
legs do not overlap — one travelling Colombo Fort → Kandy and another Kandy → Badulla
is allowed, while Colombo Fort → Ella would clash with both.

Overlap is checked in `BookingService` before the insert, using a PostgreSQL range
overlap (`&&`) against confirmed bookings for the same seat, train and date. A clash
returns `409 Conflict`.

That check alone cannot survive two simultaneous requests, so it is backed by a GiST
exclusion constraint on `bookings` — `no_overlapping_bookings_per_seat`, over
`(seat_id, train_id, travel_date, segment_range)` where `status = 'confirmed'`. The
database refuses the second insert outright, and `BookingService` turns that refusal
into the same `409` rather than a 500. Standing tickets have no `seat_id`, so the
constraint ignores them.

Bookings also carry a **seat version**: availability returns a digest of the confirmed
bookings for each seat, the client sends it back as `expected_seat_version`, and a
mismatch is rejected with `409`. This catches a client acting on availability it
loaded before someone else booked.

### A quick tour with the seeded data

1. Go to **Booking Create**, choose train `1005`, any date, Colombo Fort → Kandy,
   enter a name, and load seats.
2. Click **Reserved**, pick Coach 1 / Seat 1, and create the booking.
3. Go to **Seat Visualization**, select the same train, date and stations. Seat 1 of
   Coach 1 is now red; everything else stays blue.
4. Change the destination to Badulla — still red, because that leg overlaps.
5. Change the origin to Kandy and destination to Badulla — seat 1 turns blue again,
   because that leg does not overlap the booked one, and can be sold to someone else.

## How the ticket fare is calculated

Fares are computed at booking time by
[`FareCalculatorService`](app/services/fare_calculator_service.rb). Nothing is stored
per-route — the fare is derived from distance and coach type:

```
fare = round( (destination.distance_km - origin.distance_km) × rate_per_km )
```

The rate depends on the coach type chosen at booking:

| Coach type | Constant | Rate per km |
| --- | --- | --- |
| Reserved | `RATE_PER_KM` | 3.2 |
| Unreserved | `RATE_PER_KM_UNRESERVED` | 2.0 |

Because `distance_km` is cumulative from the start of the line, subtracting the two
stations gives the length of the leg actually travelled — a passenger only pays for
their own segment, not the full route.

Worked examples using the seeded stations:

| Journey | Distance | Reserved | Unreserved |
| --- | --- | --- | --- |
| Colombo Fort → Kandy | 120.74 km | 386 | 241 |
| Kandy → Ella | 150.29 km | 481 | 301 |
| Colombo Fort → Badulla | 292.3 km | 935 | 585 |

The result is rounded to the nearest whole unit and saved on the booking, so a later
rate change does not alter fares already sold. To change pricing, edit the two
constants at the top of `app/services/fare_calculator_service.rb`. If a booking
arrives with no coach type, the reserved rate applies.
