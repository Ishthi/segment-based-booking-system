class BookingsController < ApplicationController
  def create
    key = request.headers["Idempotency-Key"]

    if key.present?
      existing = IdempotencyKey.find_by(key: key)
      if existing
        return render json: existing.response_body, status: existing.response_status
      end
    end

    result = BookingService.new(
      journey: journey, seat: seat, origin_station: origin, destination_station: destination,
      passenger_name: params[:passenger_name], expected_seat_version: params[:expected_seat_version]
    ).call

    status = result.success? ? :created : (result.status == :conflict ? :conflict : :unprocessable_entity)
    body = result.success? ? BookingSerializer.new(result.booking).as_json : { error: result.error }

    IdempotencyKey.create!(key: key, request_hash: Digest::SHA256.hexdigest(params.to_json),
                            response_status: status, response_body: body) if key.present?

    render json: body, status: status
  end
end
