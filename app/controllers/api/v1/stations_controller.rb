class Api::V1::StationsController < ApplicationController
  before_action :set_station, only: [ :show, :update, :destroy ]

  def index
    stations = Station.order(:sequence)

    render json: stations
  end

  def show
    render json: @station
  end

  def create
    station = Station.create!(station_params)

    render json: station, status: :created
  end

  def update
    @station.update!(station_params)

    render json: @station
  end

  def destroy
    @station.destroy!

    head :no_content
  end

  private

  def set_station
    @station = Station.find(params[:id])
  end

  def station_params
    params.require(:station)
          .permit(
            :name,
            :sequence,
            :distance_km
          )
  end
end
