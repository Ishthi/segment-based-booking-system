class Api::V1::SeatAvailabilityController < Api::V1::ApplicationController
  def show
    train = Train.find(params[:train_id])
    origin = Station.find(params[:origin_station_id])
    destination = Station.find(params[:destination_station_id])
    travel_date = Date.parse(params[:travel_date].to_s)

    coach_groups = SeatAvailabilityService.new(
      train_id: train.id,
      travel_date: travel_date,
      origin_station: origin,
      destination_station: destination
    ).coach_availability

    payload = coach_groups.map do |coach|
      {
        coach_id: coach[:coach_id],
        coach_number: coach[:coach_number],
        coach_type: coach[:coach_type],
        available_seat_count: coach[:available_seat_count],
        label: if coach[:coach_type] == "reserved"
                 coach[:available_seat_count].zero? ? "All seats booked" : nil
               else
                 coach[:available_seat_count].zero? ? "Standing allowed" : nil
               end,
        seats: coach[:seats].map do |seat|
          {
            id: seat.id,
            coach: seat.coach.coach_number,
            number: seat.seat_number,
            version: SeatVersionService.new(seat).version
          }
        end
      }
    end

    etag = payload.map { |c| "#{c[:coach_id]}:#{c[:available_seat_count]}" }.join(",")

    if stale?(etag: etag, public: false)
      render json: payload
    end
  end
end
