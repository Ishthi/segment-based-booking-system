import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'

type Section = 'stations' | 'bookings' | 'trains' | 'visualization'

type Station = {
  id: number
  name: string
  sequence: number
  distance_km: number
}

type Train = {
  id: number
  name: string
}

type Coach = {
  id: number
  coach_number: number
  coach_type: CoachType
  seat_count: number
  train_id: number
}

type CoachSeats = {
  coach: Coach
  seats: Seat[]
}

type Seat = {
  id: number
  seat_number: string
  coach_id: number
}

type AvailableSeat = {
  id: number
  coach: number
  number: string
  version: number
}

type CoachType = 'reserved' | 'unreserved'

type CoachAvailability = {
  coach_id: number
  coach_number: number
  coach_type: CoachType
  available_seat_count: number
  label: string | null
  seats: AvailableSeat[]
}

const COACH_TYPES: CoachType[] = ['reserved', 'unreserved']

const EMPTY_BOOKING_FORM = {
  train_id: '',
  travel_date: '',
  origin_station_id: '',
  destination_station_id: '',
  seat_id: '',
  passenger_name: '',
  expected_seat_version: '',
}

const API_BASE = 'http://localhost:3000/api/v1'

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error((data as { message?: string; error?: string }).message || (data as { message?: string; error?: string }).error || 'Request failed')
  }

  return data as T
}

function App() {
  const [activeSection, setActiveSection] = useState<Section>('stations')

  const [stations, setStations] = useState<Station[]>([])
  const [stationForm, setStationForm] = useState({ id: '', name: '', sequence: '', distance_km: '' })

  const [trains, setTrains] = useState<Train[]>([])
  const [trainForm, setTrainForm] = useState({ id: '', name: '' })

  const [coaches, setCoaches] = useState<Coach[]>([])
  const [coachForm, setCoachForm] = useState({ coach_number: '', coach_type: 'reserved', seat_count: '' })

  const [seats, setSeats] = useState<Seat[]>([])
  const [seatForm, setSeatForm] = useState({ seat_number: '' })

  const [selectedTrainId, setSelectedTrainId] = useState('')
  const [coachAvailability, setCoachAvailability] = useState<CoachAvailability[]>([])
  const [selectedCoachType, setSelectedCoachType] = useState<CoachType | null>(null)
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)

  const [visualizationTrainId, setVisualizationTrainId] = useState('')
  const [visualizationJourney, setVisualizationJourney] = useState({
    travel_date: '',
    origin_station_id: '',
    destination_station_id: '',
  })
  const [visualizationAvailability, setVisualizationAvailability] = useState<CoachAvailability[] | null>(null)
  const [visualizationCoaches, setVisualizationCoaches] = useState<Coach[]>([])
  const [visualizationCoachType, setVisualizationCoachType] = useState<CoachType | null>(null)
  const [visualizationSeats, setVisualizationSeats] = useState<CoachSeats[]>([])
  const [visualizationLoading, setVisualizationLoading] = useState(false)

  const [bookingForm, setBookingForm] = useState({ ...EMPTY_BOOKING_FORM })
  const [availableSeats, setAvailableSeats] = useState<AvailableSeat[]>([])
  const [bookingMessage, setBookingMessage] = useState('')

  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([loadStations(), loadTrains()])
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedTrainId) {
      loadCoaches(selectedTrainId)
    } else {
      setCoaches([])
      setSeats([])
      setSelectedCoachId(null)
    }
  }, [selectedTrainId])

  useEffect(() => {
    if (selectedCoachId && selectedTrainId) {
      loadSeats(selectedTrainId, selectedCoachId || '')
    } else {
      setSeats([])
    }
  }, [selectedCoachId, selectedTrainId])

  useEffect(() => {
    if (!visualizationTrainId) {
      setVisualizationCoaches([])
      setVisualizationCoachType(null)
      setVisualizationSeats([])
      return
    }

    let cancelled = false

    const loadVisualizationCoaches = async () => {
      setVisualizationLoading(true)
      setVisualizationCoachType(null)
      setVisualizationSeats([])

      try {
        const data = await requestJson<Coach[]>(`${API_BASE}/trains/${visualizationTrainId}/coaches`)
        if (!cancelled) setVisualizationCoaches(data)
      } catch (error) {
        if (!cancelled) {
          setVisualizationCoaches([])
          alert(error instanceof Error ? error.message : 'Could not load coaches')
        }
      } finally {
        if (!cancelled) setVisualizationLoading(false)
      }
    }

    loadVisualizationCoaches()

    return () => {
      cancelled = true
    }
  }, [visualizationTrainId])

  const stationsBySequence = [...stations].sort((a, b) => a.sequence - b.sequence)

  const findStation = (stationId: string) => stations.find((station) => String(station.id) === stationId)

  const destinationOptions = (originStationId: string) => {
    const origin = findStation(originStationId)
    if (!origin) return []

    return stationsBySequence.filter((station) => station.sequence > origin.sequence)
  }

  // Changing the origin can strand an already-picked destination behind it, so drop it when that happens.
  const applyOriginChange = <T extends { origin_station_id: string; destination_station_id: string }>(
    form: T,
    originStationId: string,
  ): T => {
    const origin = findStation(originStationId)
    const destination = findStation(form.destination_station_id)
    const destinationStillAhead = Boolean(origin && destination && destination.sequence > origin.sequence)

    return {
      ...form,
      origin_station_id: originStationId,
      destination_station_id: destinationStillAhead ? form.destination_station_id : '',
    }
  }

  const journeySelected = Boolean(
    visualizationTrainId &&
      visualizationJourney.travel_date &&
      visualizationJourney.origin_station_id &&
      visualizationJourney.destination_station_id &&
      visualizationJourney.origin_station_id !== visualizationJourney.destination_station_id,
  )

  useEffect(() => {
    if (!journeySelected) {
      setVisualizationAvailability(null)
      return
    }

    let cancelled = false

    const loadVisualizationAvailability = async () => {
      try {
        const data = await requestJson<CoachAvailability[]>(
          `${API_BASE}/availability?train_id=${visualizationTrainId}&travel_date=${visualizationJourney.travel_date}&origin_station_id=${visualizationJourney.origin_station_id}&destination_station_id=${visualizationJourney.destination_station_id}`,
        )
        if (!cancelled) setVisualizationAvailability(data)
      } catch (error) {
        if (!cancelled) {
          setVisualizationAvailability(null)
          alert(error instanceof Error ? error.message : 'Could not load availability')
        }
      }
    }

    loadVisualizationAvailability()

    return () => {
      cancelled = true
    }
  }, [
    journeySelected,
    visualizationTrainId,
    visualizationJourney.travel_date,
    visualizationJourney.origin_station_id,
    visualizationJourney.destination_station_id,
  ])

  const availableSeatIds = new Set(
    (visualizationAvailability ?? []).flatMap((coach) => coach.seats.map((seat) => seat.id)),
  )

  const visualizationSummary = (coachType: CoachType) => {
    const group = visualizationCoaches.filter((coach) => coach.coach_type === coachType)
    const availabilityGroup = (visualizationAvailability ?? []).filter((coach) => coach.coach_type === coachType)

    return {
      coaches: group,
      coachCount: group.length,
      seatCount: group.reduce((total, coach) => total + coach.seat_count, 0),
      freeSeatCount: availabilityGroup.reduce((total, coach) => total + coach.available_seat_count, 0),
    }
  }

  const handleVisualizationTypeSelect = async (coachType: CoachType) => {
    const { coaches: group } = visualizationSummary(coachType)

    setVisualizationCoachType(coachType)
    setVisualizationSeats([])
    setVisualizationLoading(true)

    try {
      const seatsPerCoach = await Promise.all(
        group.map((coach) => requestJson<Seat[]>(`${API_BASE}/trains/${visualizationTrainId}/coaches/${coach.id}/seats`)),
      )

      setVisualizationSeats(group.map((coach, index) => ({ coach, seats: seatsPerCoach[index] })))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not load seats')
    } finally {
      setVisualizationLoading(false)
    }
  }

  const loadStations = async () => {
    const data = await requestJson<Station[]>(`${API_BASE}/stations`)
    setStations(data)
  }

  const loadTrains = async () => {
    const data = await requestJson<Train[]>(`${API_BASE}/trains`)
    setTrains(data)
  }

  const loadCoaches = async (trainId: string) => {
    const data = await requestJson<Coach[]>(`${API_BASE}/trains/${trainId}/coaches`)
    setCoaches(data)
  }

  const loadSeats = async (trainId: string, coachId: string) => {
    const data = await requestJson<Seat[]>(`${API_BASE}/trains/${trainId}/coaches/${coachId}/seats`)
    setSeats(data)
  }

  const handleStationSubmit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      if (stationForm.id) {
        await requestJson<Station>(`${API_BASE}/stations/${stationForm.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            station: {
              name: stationForm.name,
              sequence: Number(stationForm.sequence),
              distance_km: Number(stationForm.distance_km),
            },
          }),
        })
      } else {
        await requestJson<Station>(`${API_BASE}/stations`, {
          method: 'POST',
          body: JSON.stringify({
            station: {
              name: stationForm.name,
              sequence: Number(stationForm.sequence),
              distance_km: Number(stationForm.distance_km),
            },
          }),
        })
      }

      setStationForm({ id: '', name: '', sequence: '', distance_km: '' })
      await loadStations()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Station save failed')
    }
  }

  const handleStationEdit = (station: Station) => {
    setStationForm({
      id: String(station.id),
      name: station.name,
      sequence: String(station.sequence),
      distance_km: String(station.distance_km),
    })
  }

  const handleStationDelete = async (id: number) => {
    if (!window.confirm('Delete this station?')) return
    try {
      await requestJson(`${API_BASE}/stations/${id}`, { method: 'DELETE' })
      await loadStations()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Delete failed')
    }
  }

  const handleTrainSubmit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      if (trainForm.id) {
        await requestJson<Train>(`${API_BASE}/trains/${trainForm.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ train: { name: trainForm.name } }),
        })
      } else {
        await requestJson<Train>(`${API_BASE}/trains`, {
          method: 'POST',
          body: JSON.stringify({ train: { name: trainForm.name } }),
        })
      }

      setTrainForm({ id: '', name: '' })
      await loadTrains()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Train save failed')
    }
  }

  const handleTrainEdit = (train: Train) => {
    setTrainForm({ id: String(train.id), name: train.name })
  }

  const handleTrainDelete = async (id: number) => {
    if (!window.confirm('Delete this train?')) return
    try {
      await requestJson(`${API_BASE}/trains/${id}`, { method: 'DELETE' })
      await loadTrains()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Delete failed')
    }
  }

  const handleCoachSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedTrainId) return

    try {
      await requestJson<Coach>(`${API_BASE}/trains/${selectedTrainId}/coaches`, {
        method: 'POST',
        body: JSON.stringify({
          coach: {
            coach_number: Number(coachForm.coach_number),
            coach_type: coachForm.coach_type,
            seat_count: Number(coachForm.seat_count),
          },
        }),
      })

      setCoachForm({ coach_number: '', coach_type: 'reserved', seat_count: '' })
      await loadCoaches(selectedTrainId)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Coach save failed')
    }
  }

  const handleSeatSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedTrainId || !selectedCoachId) return

    try {
      await requestJson<Seat>(`${API_BASE}/trains/${selectedTrainId}/coaches/${selectedCoachId}/seats`, {
        method: 'POST',
        body: JSON.stringify({
          seat: {
            seat_number: seatForm.seat_number,
          },
        }),
      })

      setSeatForm({ seat_number: '' })
      await loadSeats(selectedTrainId, selectedCoachId || '')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Seat save failed')
    }
  }

  const handleBookingSearch = async () => {
    if (availabilityLoading) return

    if (!bookingForm.train_id || !bookingForm.travel_date || !bookingForm.origin_station_id || !bookingForm.destination_station_id) {
      alert('Choose train, date, origin and destination first')
      return
    }

    try {
      setAvailabilityLoading(true)
      setBookingMessage('Loading availability...')

      const data = await requestJson<CoachAvailability[]>(
        `${API_BASE}/availability?train_id=${bookingForm.train_id}&travel_date=${bookingForm.travel_date}&origin_station_id=${bookingForm.origin_station_id}&destination_station_id=${bookingForm.destination_station_id}`,
      )

      setCoachAvailability(data)
      setSelectedCoachType(null)
      setAvailableSeats([])
      setBookingForm((form) => ({ ...form, seat_id: '' }))
      setBookingMessage('Pick a coach type to see its seats')
    } catch (error) {
      setBookingMessage('')
      alert(error instanceof Error ? error.message : 'Could not load coach availability')
    } finally {
      setAvailabilityLoading(false)
    }
  }

  const coachTypeSummary = (coachType: CoachType) => {
    const group = coachAvailability.filter((coach) => coach.coach_type === coachType)

    return {
      coachCount: group.length,
      availableSeatCount: group.reduce((total, coach) => total + coach.available_seat_count, 0),
      seats: group.flatMap((coach) => coach.seats),
    }
  }

  const handleCoachTypeSelect = (coachType: CoachType) => {
    const { seats: typeSeats } = coachTypeSummary(coachType)

    setSelectedCoachType(coachType)
    setAvailableSeats(typeSeats)
    setBookingForm((form) => ({ ...form, seat_id: '' }))
    setBookingMessage(
      typeSeats.length > 0
        ? `${typeSeats.length} seats available in ${coachType} coaches`
        : coachType === 'reserved'
          ? 'All seats booked in reserved coaches'
          : 'No seats left — standing allowed in unreserved coaches',
    )
  }

  const resetBookingPage = () => {
    setBookingForm({ ...EMPTY_BOOKING_FORM })
    setCoachAvailability([])
    setSelectedCoachType(null)
    setAvailableSeats([])
  }

  const handleBookingSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!selectedCoachType) {
      alert('Pick a reserved or unreserved coach first')
      return
    }

    if (selectedCoachType === 'reserved' && !bookingForm.seat_id) {
      alert('Select a seat for reserved coach')
      return
    }

    try {
      await requestJson(
        `${API_BASE}/bookings`,
        {
          method: 'POST',
          body: JSON.stringify({
            train_id: Number(bookingForm.train_id),
            travel_date: bookingForm.travel_date,
            passenger_name: bookingForm.passenger_name,
            seat_id: bookingForm.seat_id ? Number(bookingForm.seat_id) : null,
            coach_type: selectedCoachType,
            origin_station_id: Number(bookingForm.origin_station_id),
            destination_station_id: Number(bookingForm.destination_station_id),
          }),
        },
      )

      resetBookingPage()
      setBookingMessage('Booking created — ready for the next one')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Booking failed')
    }
  }
  if (loading) {
    return <div className="app-shell"><p>Loading data...</p></div>
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>Admin Console</h2>
        <button className={activeSection === 'stations' ? 'active' : ''} onClick={() => setActiveSection('stations')}>
          Stations
        </button>
         <button className={activeSection === 'trains' ? 'active' : ''} onClick={() => setActiveSection('trains')}>
          Trains / Coaches / Seats
        </button>
        <button className={activeSection === 'visualization' ? 'active' : ''} onClick={() => setActiveSection('visualization')}>
          Seat Visualization
        </button>
        <button className={activeSection === 'bookings' ? 'active' : ''} onClick={() => setActiveSection('bookings')}>
          Booking Create
        </button>
      </aside>

      <main className="content">
        {activeSection === 'stations' && (
          <section className="panel">
            <h1>Stations CRUD</h1>
            <form onSubmit={handleStationSubmit}>
              <input
                value={stationForm.name}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setStationForm({ ...stationForm, name: event.target.value })}
                placeholder="Station name"
                required
              />
              <input
                type="number"
                value={stationForm.sequence}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setStationForm({ ...stationForm, sequence: event.target.value })}
                placeholder="Sequence"
                required
              />
              <input
                type="number"
                value={stationForm.distance_km}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setStationForm({ ...stationForm, distance_km: event.target.value })}
                placeholder="Distance km"
                required
              />
              <button type="submit">{stationForm.id ? 'Update station' : 'Create station'}</button>
            </form>

            <ul className="list">
              {stations.map((station) => (
                <li key={station.id}>
                  <strong>{station.name}</strong> {station.distance_km} km
                  <div className="actions">
                    <button type="button" onClick={() => handleStationEdit(station)}>Edit</button>
                    <button type="button" onClick={() => handleStationDelete(station.id)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {activeSection === 'visualization' && (
          <section className="panel">
            <h1>Seat Visualization</h1>

            <select
              className="train-picker"
              value={visualizationTrainId}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setVisualizationTrainId(event.target.value)}
            >
              <option value="">Select train</option>
              {trains.map((train) => (
                <option key={train.id} value={train.id}>
                  {train.name}
                </option>
              ))}
            </select>

            {visualizationTrainId && (
              <div className="visualization-filters">
                <input
                  type="date"
                  value={visualizationJourney.travel_date}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setVisualizationJourney({ ...visualizationJourney, travel_date: event.target.value })
                  }
                />
                <select
                  value={visualizationJourney.origin_station_id}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    setVisualizationJourney(applyOriginChange(visualizationJourney, event.target.value))
                  }
                >
                  <option value="">Origin station</option>
                  {stationsBySequence.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name}
                    </option>
                  ))}
                </select>
                <select
                  value={visualizationJourney.destination_station_id}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    setVisualizationJourney({ ...visualizationJourney, destination_station_id: event.target.value })
                  }
                  disabled={!visualizationJourney.origin_station_id}
                >
                  <option value="">
                    {visualizationJourney.origin_station_id ? 'Destination station' : 'Select origin first'}
                  </option>
                  {destinationOptions(visualizationJourney.origin_station_id).map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!visualizationTrainId && <p>Select a train to see its coaches.</p>}

            {visualizationTrainId && !journeySelected && (
              <p>Pick a date, origin and destination to see which seats are booked.</p>
            )}

            {visualizationTrainId && visualizationCoaches.length > 0 && (
              <div className="coach-tiles">
                {COACH_TYPES.map((coachType) => {
                  const { coachCount, seatCount, freeSeatCount } = visualizationSummary(coachType)
                  const isSelected = visualizationCoachType === coachType

                  return (
                    <button
                      key={coachType}
                      type="button"
                      className={`coach-tile ${coachType}${isSelected ? ' selected' : ''}`}
                      onClick={() => handleVisualizationTypeSelect(coachType)}
                      disabled={coachCount === 0}
                      aria-pressed={isSelected}
                    >
                      <span className="coach-tile-title">
                        {coachType === 'reserved' ? 'Reserved' : 'Unreserved'} coach
                      </span>
                      <span className="coach-tile-count">
                        {coachCount === 0
                          ? 'No coaches on this train'
                          : visualizationAvailability
                            ? `${freeSeatCount} of ${seatCount} seats free`
                            : `${seatCount} seats`}
                      </span>
                      <span className="coach-tile-meta">
                        {coachCount} {coachCount === 1 ? 'coach' : 'coaches'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {visualizationTrainId && !visualizationLoading && visualizationCoaches.length === 0 && (
              <p>This train has no coaches yet.</p>
            )}

            {visualizationLoading && <p>Loading...</p>}

            {visualizationCoachType && !visualizationLoading && (
              <div className="seat-map">
                {visualizationAvailability && (
                  <div className="seat-legend">
                    <span className={`seat-chip ${visualizationCoachType}`}>&nbsp;</span> Free
                    <span className="seat-chip booked">&nbsp;</span> Booked
                  </div>
                )}

                {visualizationSeats.map(({ coach, seats: coachSeats }) => {
                  const bookedCount = visualizationAvailability
                    ? coachSeats.filter((seat) => !availableSeatIds.has(seat.id)).length
                    : 0

                  return (
                    <div key={coach.id} className="seat-map-coach">
                      <h3>
                        Coach {coach.coach_number} — {coach.coach_type} — {coachSeats.length} seats
                        {visualizationAvailability ? ` — ${bookedCount} booked` : ''}
                      </h3>
                      {coachSeats.length > 0 ? (
                        <div className="seat-grid">
                          {coachSeats.map((seat) => {
                            const isBooked = Boolean(visualizationAvailability) && !availableSeatIds.has(seat.id)

                            return (
                              <span
                                key={seat.id}
                                className={`seat-chip ${isBooked ? 'booked' : coach.coach_type}`}
                                title={isBooked ? 'Booked on this segment' : 'Free'}
                              >
                                {seat.seat_number}
                              </span>
                            )
                          })}
                        </div>
                      ) : (
                        <p>No seats created for this coach.</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {activeSection === 'bookings' && (
          <section className="panel">
            <h1>Booking Create Page</h1>

            <form onSubmit={handleBookingSubmit}>
              <select
                value={bookingForm.train_id}
                onChange={(event) => setBookingForm({ ...bookingForm, train_id: event.target.value })}
                required
              >
                <option value="">Select train</option>
                {trains.map((train) => (
                  <option key={train.id} value={train.id}>
                    {train.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={bookingForm.travel_date}
                onChange={(event) => setBookingForm({ ...bookingForm, travel_date: event.target.value })}
                required
              />

              <select
                value={bookingForm.origin_station_id}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => setBookingForm(applyOriginChange(bookingForm, event.target.value))}
                required
              >
                <option value="">Origin station</option>
                {stationsBySequence.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name}
                  </option>
                ))}
              </select>

              <select
                value={bookingForm.destination_station_id}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => setBookingForm({ ...bookingForm, destination_station_id: event.target.value })}
                disabled={!bookingForm.origin_station_id}
                required
              >
                <option value="">
                  {bookingForm.origin_station_id ? 'Destination station' : 'Select origin first'}
                </option>
                {destinationOptions(bookingForm.origin_station_id).map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name}
                  </option>
                ))}
              </select>

            <button type="button" onClick={handleBookingSearch} disabled={availabilityLoading}>
              {availabilityLoading ? 'Loading...' : 'Load available seats'}
            </button>
              {coachAvailability.length > 0 && (
                <div className="coach-tiles">
                  {COACH_TYPES.map((coachType) => {
                    const { coachCount, availableSeatCount } = coachTypeSummary(coachType)
                    const isSelected = selectedCoachType === coachType

                    return (
                      <button
                        key={coachType}
                        type="button"
                        className={`coach-tile ${coachType}${isSelected ? ' selected' : ''}`}
                        onClick={() => handleCoachTypeSelect(coachType)}
                        disabled={coachCount === 0}
                        aria-pressed={isSelected}
                      >
                        <span className="coach-tile-title">
                          {coachType === 'reserved' ? 'Reserved' : 'Unreserved'} coach
                        </span>
                        <span className="coach-tile-count">
                          {coachCount === 0
                            ? 'No coaches on this train'
                            : availableSeatCount > 0
                              ? `${availableSeatCount} seats available`
                              : coachType === 'reserved'
                                ? 'All seats booked'
                                : 'Standing allowed'}
                        </span>
                        <span className="coach-tile-meta">
                          {coachCount} {coachCount === 1 ? 'coach' : 'coaches'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {selectedCoachType && (
                <select
                  value={bookingForm.seat_id}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) => setBookingForm({ ...bookingForm, seat_id: event.target.value })}
                  required={selectedCoachType === 'reserved'}
                >
                  <option value="">
                    {selectedCoachType === 'reserved' ? 'Select seat' : 'Select seat (optional)'}
                  </option>
                  {availableSeats.map((seat) => (
                    <option key={seat.id} value={seat.id}>
                      Coach {seat.coach} — Seat {seat.number}
                    </option>
                  ))}
                </select>
              )}
               <input
                value={bookingForm.passenger_name}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setBookingForm({ ...bookingForm, passenger_name: event.target.value })}
                placeholder="Passenger name"
                required
              />

              <button type="submit">Create booking</button>
            </form>

            {bookingMessage && <p className="message">{bookingMessage}</p>}
          </section>
        )}

        {activeSection === 'trains' && (
          <section className="panel">
            <h1>Trains, Coaches, and Seats</h1>

            <div className="grid">
              <div>
                <h2>Trains</h2>
                <form onSubmit={handleTrainSubmit}>
                  <input
                    value={trainForm.name}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setTrainForm({ ...trainForm, name: event.target.value })}
                    placeholder="Train name"
                    required
                  />
                  <button type="submit">{trainForm.id ? 'Update train' : 'Create train'}</button>
                </form>

                <ul className="list">
                  {trains.map((train) => (
                    <li key={train.id}>
                      <strong>{train.name}</strong>
                      <div className="actions">
                        <button type="button" onClick={() => handleTrainEdit(train)}>Edit</button>
                        <button type="button" onClick={() => handleTrainDelete(train.id)}>Delete</button>
                        <button type="button" onClick={() => setSelectedTrainId(String(train.id))}>
                          Go to coaches
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2>Coaches</h2>
                {selectedTrainId ? (
                  <>
                    <form onSubmit={handleCoachSubmit}>
                      <input
                        type="number"
                        value={coachForm.coach_number}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => setCoachForm({ ...coachForm, coach_number: event.target.value })}
                        placeholder="Coach number"
                        required
                      />
                      <select
                        value={coachForm.coach_type}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) => setCoachForm({ ...coachForm, coach_type: event.target.value })}
                      >
                        <option value="reserved">Reserved</option>
                        <option value="unreserved">Unreserved</option>
                      </select>
                      <input
                        type="number"
                        value={coachForm.seat_count}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => setCoachForm({ ...coachForm, seat_count: event.target.value })}
                        placeholder="Seat count"
                        required
                      />
                      <button type="submit">Create coach</button>
                    </form>

                    <ul className="list">
                      {coaches.map((coach) => (
                        <li key={coach.id}>
                          Coach {coach.coach_number} — {coach.coach_type} — {coach.seat_count} seats
                          <div className="actions">
                            <button type="button" onClick={() => setSelectedCoachId(String(coach.id))}>
                              Go to seats
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p>Select a train first.</p>
                )}
              </div>

              <div>
                <h2>Seats</h2>
                {selectedCoachId ? (
                  <>
                    <form onSubmit={handleSeatSubmit}>
                      <input
                        value={seatForm.seat_number}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => setSeatForm({ ...seatForm, seat_number: event.target.value })}
                        placeholder="Seat number"
                        required
                      />
                      <button type="submit">Create seat</button>
                    </form>

                    <ul className="list">
                      {seats.map((seat) => (
                        <li key={seat.id}>Seat {seat.seat_number}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p>Select a coach first.</p>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App