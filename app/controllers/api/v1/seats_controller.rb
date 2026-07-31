class SeatsController < ApplicationController
  def show
    seat = Seat.find(params[:id])
    etag = SeatVersionService.new(seat).version

    fresh_when(etag: etag, public: false)  # sets ETag header, handles If-None-Match automatically

    render json: {
      id: seat.id,
      coach: seat.coach.coach_number,
      seat_number: seat.seat_number
    }
  end
end
