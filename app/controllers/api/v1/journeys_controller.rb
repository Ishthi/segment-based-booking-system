class Api::V1::JourneysController < Api::V1::ApplicationController
  before_action :set_journey, only: [ :show ]

  def index
    journeys = Journey.includes(:train).order(:travel_date)

    render json: journeys
  end

  def create
    journey = Journey.create!(
      journey_params
    )

    render json: journey
  end

  def show
    render json: @journey
  end

  private

  def set_journey
    @journey = Journey.find(params[:id])
  end

  def journey_params
    params.require(:journey)
          .permit(
            :train_id,
            :travel_date
          )
  end
end
