class Api::V1::CoachesController < ApplicationController
  before_action :set_coach, only: [ :show, :update, :destroy ]

  def index
    coaches = Coach.includes(:train).order(:coach_number)

    render json: coaches
  end

  def show
    render json: @coach
  end

  def create
    coach = Coach.create!(coach_params)

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

  def set_coach
    @coach = Coach.find(params[:id])
  end

  def coach_params
    params.require(:coach)
          .permit(
            :train_id,
            :coach_number,
            :coach_type,
            :seat_count
          )
  end
end
