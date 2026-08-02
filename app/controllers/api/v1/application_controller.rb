class Api::V1::ApplicationController < ActionController::API
  rescue_from StandardError, with: :internal_server_error
  rescue_from ActionController::ParameterMissing, with: :parameter_missing
  rescue_from ActionController::RoutingError, with: :route_not_found
  rescue_from ActiveRecord::RecordInvalid, with: :record_invalid
  rescue_from ActiveRecord::RecordNotFound, with: :record_not_found

  private

  def record_not_found(exception)
    render_error(status: :not_found, message: exception.message)
  end

  def record_invalid(exception)
    render_error(
      status: :unprocessable_entity,
      message: exception.message,
      details: exception.record.errors.full_messages
    )
  end

  def route_not_found(exception)
    render_error(status: :not_found, message: exception.message)
  end

  def parameter_missing(exception)
    render_error(status: :bad_request, message: exception.message)
  end

  def internal_server_error(exception)
    render_error(status: :internal_server_error, message: exception.message)
  end

  def render_error(status:, message:, details: nil)
    return if performed?

    payload = {
      code: Rack::Utils.status_code(status),
      message: message
    }
    payload[:details] = details if details.present?

    render json: payload, status: status
  end
end
