class Api::V1::TrainsController < ApplicationController
  before_action :set_train, only: [ :show, :update, :destroy ]

  def index
    trains = Train.order(:name)

    render json: trains
  end

  def show
    render json: @train
  end

  def create
    train = Train.create!(train_params)

    render json: train, status: :created
  end

  def update
    @train.update!(train_params)

    render json: train
  end

  def destroy
    @train.destroy!

    head :no_content
  end

  private

  def set_train
    @train = Train.find(params[:id])
  end

  def train_params
    params.require(:train)
          .permit(:name)
  end
end
