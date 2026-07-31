class Api::V1::SeatsController < Api::V1::ApplicationController
  before_action :set_seat, only: [ :show, :update, :destroy ]

  def index
    seats = Seat.includes(:coach).order(:id)

    render json: seats
  end

  def show
    render json: @seat
  end

  def create
    seat = Seat.create!(seat_params)

    render json: seat, status: :created
  end

  def update
    @seat.update!(seat_params)

    render json: @seat
  end

  def destroy
    @seat.destroy!

    head :no_content
  end

  private

  def set_seat
    @seat = Seat.find(params[:id])
  end

  def seat_params
    params.require(:seat)
          .permit(:coach_id, :seat_number)
  end
end
