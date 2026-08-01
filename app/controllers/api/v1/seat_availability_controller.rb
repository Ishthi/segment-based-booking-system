class Api::V1::SeatAvailabilityController < Api::V1::ApplicationController
  def show
    train = Train.find(params[:train_id])
    origin = Station.find(params[:origin_station_id])
    destination = Station.find(params[:destination_station_id])
    travel_date = Date.parse(params[:travel_date].to_s)

    seats = SeatAvailabilityService.new(
      train_id: train.id,
      travel_date: travel_date,
      origin_station: origin,
      destination_station: destination
    ).available_seats

    payload = seats.map do |seat|
      {
        id: seat.id,
        coach: seat.coach.coach_number,
        number: seat.seat_number,
        version: SeatVersionService.new(seat).version
      }
    end

    fresh_when(etag: payload.map { |s| "#{s[:id]}:#{s[:version]}" }.join(","), public: false)
    render json: payload
  end
end
