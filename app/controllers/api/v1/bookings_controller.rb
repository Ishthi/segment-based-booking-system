class Api::V1::BookingsController < Api::V1::ApplicationController
  def create
    key = request.headers["Idempotency-Key"]

    if key.present?
      existing = IdempotencyKey.find_by(key: key)
      if existing
        return render json: existing.response_body, status: existing.response_status
      end
    end

    result = BookingService.new(
      train: train,
      travel_date: travel_date,
      seat: seat,
      origin_station: origin_station,
      destination_station: destination_station,
      passenger_name: booking_params[:passenger_name],
      expected_seat_version: booking_params[:expected_seat_version]
    ).call

    status = result.success? ? :created : (result.status == :conflict ? :conflict : :unprocessable_entity)
    body = result.success? ? booking_payload(result.booking) : { error: result.error }

    IdempotencyKey.create!(
      key: key,
      request_hash: Digest::SHA256.hexdigest(params.to_json),
      response_status: status,
      response_body: body
    ) if key.present?

    render json: body, status: status
  end

  private

  def train
    @train ||= Train.find(booking_params[:train_id])
  end

  def travel_date
    @travel_date ||= Date.parse(booking_params[:travel_date].to_s)
  end

  def seat
    @seat ||= Seat.find(booking_params[:seat_id])
  end

  def origin_station
    @origin_station ||= Station.find(booking_params[:origin_station_id])
  end

  def destination_station
    @destination_station ||= Station.find(booking_params[:destination_station_id])
  end

  def booking_params
    params.permit(:train_id, :travel_date, :seat_id, :origin_station_id, :destination_station_id, :passenger_name, :expected_seat_version)
  end

  def booking_payload(booking)
    {
      id: booking.id,
      passenger_name: booking.passenger_name,
      fare: booking.fare,
      train_id: booking.train_id,
      travel_date: booking.travel_date,
      seat_id: booking.seat_id
    }
  end
end
