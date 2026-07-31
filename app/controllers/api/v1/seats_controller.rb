class Api::V1::SeatsController < Api::V1::ApplicationController
  before_action :set_train
  before_action :set_coach
  before_action :set_seat, only: [ :show, :update, :destroy ]

  def index
    seats = @coach.seats.includes(:coach).order(:id)
    render json: seats
  end

  def show
    render json: @seat
  end

  def create
    seat = @coach.seats.create!(seat_params)
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

  def set_train
    @train = Train.find(params[:train_id])
  end

  def set_coach
    @coach = @train.coaches.find(params[:coach_id])
  end

  def set_seat
    @seat = @coach.seats.find(params[:id])
  end

  def seat_params
    params.require(:seat).permit(:seat_number)
  end
end
