class SeatAvailabilityController < ApplicationController
  def show
    journey = Journey.find(params[:journey_id])
    origin = Station.find(params[:origin_station_id])
    destination = Station.find(params[:destination_station_id])

    seats = SeatAvailabilityService.new(
      journey: journey, origin_station: origin, destination_station: destination
    ).available_seats

    payload = seats.map do |seat|
      { id: seat.id, coach: seat.coach.coach_number, number: seat.seat_number,
        version: SeatVersionService.new(seat).version }
    end

    fresh_when(etag: payload.map { |s| "#{s[:id]}:#{s[:version]}" }.join(","), public: false)
    render json: payload
  end
end
