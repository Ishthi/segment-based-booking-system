class Api::V1::JourneysController < Api::V1::ApplicationController
  def create
    journey = Journey.create!(
      journey_params
    )

    render json: journey
  end
end
