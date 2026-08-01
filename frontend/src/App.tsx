import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'

type Section = 'stations' | 'bookings' | 'trains'

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
  coach_type: string
  seat_count: number
  train_id: number
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
  const [selectedCoachId, setSelectedCoachId] = useState('')

  const [bookingForm, setBookingForm] = useState({
    train_id: '',
    travel_date: '',
    origin_station_id: '',
    destination_station_id: '',
    seat_id: '',
    passenger_name: '',
    expected_seat_version: '',
  })
  const [availableSeats, setAvailableSeats] = useState<AvailableSeat[]>([])
  const [bookingMessage, setBookingMessage] = useState('')

  useEffect(() => {
    loadStations()
    loadTrains()
  }, [])

  useEffect(() => {
    if (selectedTrainId) {
      loadCoaches(selectedTrainId)
    } else {
      setCoaches([])
      setSeats([])
      setSelectedCoachId('')
    }
  }, [selectedTrainId])

  useEffect(() => {
    if (selectedCoachId && selectedTrainId) {
      loadSeats(selectedTrainId, selectedCoachId)
    } else {
      setSeats([])
    }
  }, [selectedCoachId, selectedTrainId])

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
      await loadSeats(selectedTrainId, selectedCoachId)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Seat save failed')
    }
  }

  const handleBookingSearch = async () => {
    if (!bookingForm.origin_station_id || !bookingForm.destination_station_id) {
      alert('Choose origin, and destination first')
      return
    }

    try {
    const data = await requestJson<AvailableSeat[]>(
      `${API_BASE}/availability?train_id=${bookingForm.train_id}&travel_date=${bookingForm.travel_date}&origin_station_id=${bookingForm.origin_station_id}&destination_station_id=${bookingForm.destination_station_id}`,
    )
      setAvailableSeats(data)
      setBookingMessage('Available seats loaded')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not load seats')
    }
  }

  const handleBookingSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!bookingForm.seat_id || !bookingForm.origin_station_id || !bookingForm.destination_station_id) {
      alert('Select origin, destination, and seat')
      return
    }
    
    try {
      const res = await requestJson<{ id: number; passenger_name: string; fare: number }>(
        `${API_BASE}/bookings`,
        {
          method: 'POST',
          body: JSON.stringify({
            train_id: Number(bookingForm.train_id),
            travel_date: bookingForm.travel_date,
            passenger_name: bookingForm.passenger_name,
            seat_id: Number(bookingForm.seat_id),
            origin_station_id: Number(bookingForm.origin_station_id),
            destination_station_id: Number(bookingForm.destination_station_id),
            expected_seat_version: bookingForm.expected_seat_version || undefined,
          }),
        },
      )

      setBookingMessage(`Booking created for ${res.passenger_name} with fare ${res.fare}`)
      setBookingForm({ ...bookingForm, seat_id: '', passenger_name: '', expected_seat_version: '' })
      setAvailableSeats([])
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Booking failed')
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>Admin Console</h2>
        <button className={activeSection === 'stations' ? 'active' : ''} onClick={() => setActiveSection('stations')}>
          Stations
        </button>
        <button className={activeSection === 'bookings' ? 'active' : ''} onClick={() => setActiveSection('bookings')}>
          Booking Create
        </button>
        <button className={activeSection === 'trains' ? 'active' : ''} onClick={() => setActiveSection('trains')}>
          Trains / Coaches / Seats
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
                onChange={(event: ChangeEvent<HTMLSelectElement>) => setBookingForm({ ...bookingForm, origin_station_id: event.target.value })}
                required
              >
                <option value="">Origin station</option>
                {stations.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name}
                  </option>
                ))}
              </select>

              <select
                value={bookingForm.destination_station_id}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => setBookingForm({ ...bookingForm, destination_station_id: event.target.value })}
                required
              >
                <option value="">Destination station</option>
                {stations.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name}
                  </option>
                ))}
              </select>

              <input
                value={bookingForm.passenger_name}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setBookingForm({ ...bookingForm, passenger_name: event.target.value })}
                placeholder="Passenger name"
                required
              />

              <button type="button" onClick={handleBookingSearch}>
                Load available seats
              </button>

              <select
                value={bookingForm.seat_id}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => setBookingForm({ ...bookingForm, seat_id: event.target.value })}
              >
                <option value="">Select seat</option>
                {availableSeats.map((seat) => (
                  <option key={seat.id} value={seat.id}>
                    Coach {seat.coach} — Seat {seat.number}
                  </option>
                ))}
              </select>

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
                          Open
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
                              Open seats
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