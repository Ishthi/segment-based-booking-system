class Api::V1::CoachesController < Api::V1::ApplicationController
  before_action :set_train
  before_action :set_coach, only: [ :show, :update, :destroy ]

  def index
    coaches = @train.coaches.includes(:train).order(:coach_number)
    render json: coaches
  end

  def show
    render json: @coach
  end

  def create
    coach = @train.coaches.create!(coach_params)
    render json: coach, status: :created
  end

  def update
    @coach.update!(coach_params)
    render json: @coach
  end

  def destroy
    @coach.destroy!
    head :no_content
  end

  private

  def set_train
    @train = Train.find(params[:train_id])
  end

  def set_coach
    @coach = @train.coaches.find(params[:id])
  end

  def coach_params
    params.require(:coach)
          .permit(:coach_number, :coach_type, :seat_count)
  end
end
