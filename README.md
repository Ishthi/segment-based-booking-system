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

## Design decisions

### Modelling a segment as an integer range over station sequence

Every station carries a `sequence` (0, 1, 2 …) that fixes its position on the line. A
booking stores `segment_range`, a PostgreSQL `int4range` built from
`origin.sequence...destination.sequence` — a **half-open** range, `[origin, destination)`.
Two legs conflict exactly when their ranges overlap, which is one operator (`&&`) rather
than a hand-written comparison.

Half-open is the detail that makes adjacent legs work. Colombo Fort → Kandy is `[0,1)`
and Kandy → Badulla is `[1,5)`; they touch but do not overlap, so the same seat is sold
twice. A closed range would have made them collide at station 1 and defeated the whole
feature.

*Alternatives considered:*

- **Storing origin/destination IDs and comparing them in Ruby.** Simplest to read, but the
  overlap test then lives in application code, cannot be indexed, and — crucially — cannot
  be enforced by the database, so there is nothing to fall back on when two requests race.
- **One row per seat per elementary segment** (a seat on a 6-station line occupies 5 rows,
  one per hop). Overlap becomes a plain unique index, which is attractive. Rejected because
  writes grow with route length, a booking is no longer one row, and cancelling or amending
  a booking turns into a multi-row operation. The range keeps a booking atomic.
- **A bitmask column, one bit per segment.** Compact and fast, but opaque to anyone reading
  the data, and it silently breaks the moment the department extends the route past the
  word size. The brief explicitly asks for a configurable number of stations.

`distance_km` is kept separate from `sequence` on purpose: sequence answers *does this
overlap*, distance answers *what does it cost*. Inserting a new station between two
existing ones only requires renumbering sequences, without touching pricing.

### Correctness under concurrent booking — three layers

The interesting failure is two people buying the same seat on overlapping legs at the same
instant. This is handled in three layers, deliberately, because each catches something the
others cannot:

1. **A pre-check in `BookingService`** — a range-overlap query against confirmed bookings
   for that seat, train and date. This exists for the *user*, not for correctness: it
   produces a clear `409 Conflict` with a readable message in the overwhelmingly common
   non-racing case.
2. **A GiST exclusion constraint** — `no_overlapping_bookings_per_seat` over
   `(seat_id, train_id, travel_date, segment_range)` where `status = 'confirmed'`. This is
   the actual guarantee. Two requests can both pass step 1 and race to insert; PostgreSQL
   refuses the second one. `BookingService` rescues `PG::ExclusionViolation` and converts
   it into the same `409` the pre-check would have produced, so a race and a normal clash
   look identical to the client rather than surfacing a 500. The constraint needs the
   `btree_gist` extension, because it mixes equality on scalar columns with `&&` on a range
   — that extension is enabled in its own migration.
3. **A seat version (optimistic concurrency)** — availability returns a digest of the
   confirmed bookings for each seat; the client sends it back as `expected_seat_version`
   and a mismatch is rejected. Layers 1 and 2 only stop *impossible* bookings. This layer
   stops a *stale* one: the user loaded a seat map, someone else booked a different leg of
   that seat, and the map on screen no longer reflects reality. The booking might still be
   legal, but the passenger is choosing from information that has since changed, so they
   are asked to reload.

*Alternatives considered:*

- **`SELECT … FOR UPDATE` on the seat row.** Works, and was the first instinct. Rejected
  because it serialises every booking attempt on a seat behind one lock even when the legs
  are disjoint — which is precisely the concurrency this system exists to unlock. It also
  only protects code paths that remember to take the lock; the constraint protects the
  table itself, including seeds, console sessions and future endpoints.
- **`SERIALIZABLE` transaction isolation.** Correct, but it pushes retry handling into
  every caller and costs throughput across the whole application to solve one table's
  problem.
- **Advisory locks keyed on seat + date.** Cheaper than row locks, but it is still mutual
  exclusion in the application layer, with the same "only as good as the code that
  remembers it" weakness, and a lock key collision fails silently.

The exclusion constraint skips rows with a `NULL` `seat_id`, which is exactly right:
standing tickets in unreserved coaches are not tied to a seat and must not conflict with
anything.

### Reserved and unreserved coaches in one model

`Coach#coach_type` is an enum (`reserved` / `unreserved`) and `bookings.seat_id` is
nullable. A reserved booking must name a seat — `BookingService` rejects it otherwise with
`422`. An unreserved booking may name one, and a blank seat means a standing ticket.

*Alternative considered:* separate tables or separate booking types for the two classes of
travel. Rejected because everything else about them is identical — same fare formula shape,
same segment semantics, same conflict rules — and splitting them would have duplicated the
availability and booking paths to express one boolean.

### Bookings carry train + travel date directly

An early version had a `Journey` model (train + date) that bookings belonged to. It was
migrated away in `MigrateJourneysToBookingTripDetails`: a journey record had no data of its
own, so it added a mandatory write and a join to every booking and availability query in
exchange for nothing. Bookings now carry `train_id` and `travel_date`, which is also what
the exclusion constraint keys on.

### Everything is configurable, nothing is counted in code

Except for the booking fare amounts, stations, trains, coaches and seats are all CRUD resources. The number of coaches, seats
per coach and stations on the line exist only as rows — the seed file happens to create the
8 coaches and 6 stations from the brief, but nothing in the application knows those
numbers. Adding a coach or extending the route past Badulla is data entry, not a deploy.

### Service objects, thin controllers, versioned API

Booking, availability, fare and seat versioning each live in their own service under
[app/services/](app/services/); controllers parse params and choose a status code. Routes
are namespaced under `/api/v1`, and a shared `Api::V1::ApplicationController` maps
exceptions onto a single error envelope (`code`, `message`, optional `details`) so the
frontend has one shape to handle.

## Challenges

**Turning a database error into an HTTP status.** Once the constraint was back, losing a
race produced an `ActiveRecord::StatementInvalid` and a 500. The rescue in `BookingService`
narrows on `e.cause.is_a?(PG::ExclusionViolation)` and re-raises anything else, so a genuine
race maps to `409` without swallowing unrelated statement errors.

**Distinguishing "unavailable" from "stale".** The exclusion constraint answers *is this
booking legal*, not *was the screen the user booked from still accurate*. Those are
different questions, and only the first is a database concern. The seat version digest is
the answer to the second.

## Extra credit

### 1. Seat map visualization

**Problem.** "Seat 4 of Coach 2 is booked" is not a true statement in this system — a seat
is only booked *with respect to a leg on a date*. That makes availability much harder to
reason about than in a whole-journey booking system, both for the department and for anyone
evaluating whether segment booking actually works.

**Solution.** A read-only view (**Seat Visualization**) that requires all four of train,
date, origin and destination before it renders anything, because there is no meaningful
seat map without them. It summarises the train as two tiles — Reserved and Unreserved, free
out of total — and expanding either draws every coach of that type, with free seats in the
type's colour and seats occupied on an overlapping leg in red.

**Design.** The availability endpoint returns only *free* seats for the selected segment,
so the view fetches the full seat list per coach and treats occupancy as a set difference.
This keeps a single availability endpoint serving both the booking flow and the map, rather
than adding a second endpoint that returns the same information inverted. The payoff is that
changing only the destination visibly repaints seats between red and free, which is the
feature made observable.

### 2. Two-tier fare instead of one distance rate

**Problem.** The brief describes the department charging reserved passengers roughly double
an unreserved fare for the same leg, justified by the seat sitting empty for the rest of the
route. Segment booking removes that justification — the seat is resold — so carrying the
same rate forward would have kept charging passengers for a cost the system no longer
incurs, which is the unfairness the brief points at.

**Solution.** `FareCalculatorService` takes the coach type and applies a different rate per
km: 3.2 reserved, 2.0 unreserved. Reserved still costs more, but 1.6× rather than 2×, and
the premium now stands for what the passenger actually receives — a guaranteed seat instead
of a standing risk — not for dead mileage.

**Design.** Rates are constants, and the computed fare is written onto the booking rather
than derived at read time, so repricing never rewrites the value of a ticket already sold.
Fares stay a pure function of `(distance, coach type)` with no per-route table to maintain;
because `distance_km` is cumulative, subtracting the two stations bills each passenger for
their own leg. A per-route or per-station-pair price matrix would be more expressive, but it
grows quadratically with the route and there is no pricing rule in the brief that needs it.

## Known limitations and what I would do next

- **No automated test suite.** The concurrency behaviour is the part most deserving of one:
  an exclusion-constraint test that fires two overlapping inserts concurrently and asserts
  exactly one survives with a `409`, plus boundary tests for adjacent legs. Verification is
  currently the manual tour above, which is the weakest point of the submission.
- **Idempotency is wired up but incomplete.** `Api::V1::BookingsController` reads an
  `Idempotency-Key` header and reaches for `response_status` / `response_body` on
  `IdempotencyKey`, but those columns were never added, so sending that header would fail.
  Nothing in the frontend sends it, so the path is dormant rather than harmful — it needs
  either the migration or removal before it is trusted.
- **Standing tickets are unbounded.** An unreserved booking with no seat always succeeds;
  there is no capacity ceiling on standing passengers per segment. A real deployment would
  cap it against the coach's standing capacity.
- **No cancellations, waitlisting, or admin reporting.** The `cancelled` status exists on
  `Booking` and the constraint already ignores non-confirmed rows, so cancellation is a
  small endpoint away; waitlisting and an occupancy/revenue view were the extra-credit items
  I did not get to.
- **No authentication.** Every endpoint is open, and the frontend is an unguarded admin
  console. Fine for a review environment, not for a launch.
