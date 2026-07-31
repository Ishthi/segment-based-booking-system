class Api::V1::JourneysController < ApplicationController
  def create
    journey = Journey.create!(
      journey_params
    )

    render json: journey
  end
end
