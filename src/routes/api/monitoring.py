"""
Monitoring API routes for the Garage Management System.
"""
from flask import Blueprint, request, jsonify
from utils.monitoring import get_system_monitor, get_health_status, get_performance_metrics
from utils.response_utils import ResponseFormatter
from utils.database_utils import DatabaseUtils
from config.logging import get_logger

monitoring_api = Blueprint('monitoring_api', __name__)
logger = get_logger('monitoring_api')


@monitoring_api.route('/health', methods=['GET'])
def health_check():
    """Get system health status."""
    try:
        health_status = get_health_status()
        
        # Determine HTTP status code based on health
        if health_status['status'] == 'critical':
            status_code = 503  # Service Unavailable
        elif health_status['status'] == 'warning':
            status_code = 200  # OK but with warnings
        else:
            status_code = 200  # OK
        
        return ResponseFormatter.success(
            data=health_status,
            status_code=status_code
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return ResponseFormatter.error(
            'Health check failed',
            status_code=503
        )


@monitoring_api.route('/health/database', methods=['GET'])
def database_health():
    """Get database health status."""
    try:
        monitor = get_system_monitor()
        db_health = monitor.check_database_health()
        
        status_code = 200
        if db_health['status'] == 'critical':
            status_code = 503
        elif db_health['status'] == 'warning':
            status_code = 200
        
        return ResponseFormatter.success(
            data=db_health,
            status_code=status_code
        )
        
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return ResponseFormatter.error(
            'Database health check failed',
            status_code=503
        )


@monitoring_api.route('/metrics', methods=['GET'])
def get_metrics():
    """Get performance metrics."""
    try:
        hours = request.args.get('hours', 1, type=int)
        
        # Limit hours to reasonable range
        hours = max(1, min(hours, 24))
        
        metrics = get_performance_metrics(hours)
        
        return ResponseFormatter.success(data={
            'metrics': metrics,
            'period_hours': hours,
            'timestamp': get_system_monitor().get_health_summary()['timestamp']
        })
        
    except Exception as e:
        logger.error(f"Failed to get metrics: {e}")
        return ResponseFormatter.error('Failed to retrieve metrics')


@monitoring_api.route('/metrics/database', methods=['GET'])
def get_database_metrics():
    """Get database-specific metrics."""
    try:
        stats = DatabaseUtils.get_database_stats()
        
        if 'error' in stats:
            return ResponseFormatter.error(
                f"Database metrics unavailable: {stats['error']}",
                status_code=503
            )
        
        return ResponseFormatter.success(data=stats)
        
    except Exception as e:
        logger.error(f"Failed to get database metrics: {e}")
        return ResponseFormatter.error('Failed to retrieve database metrics')


@monitoring_api.route('/status', methods=['GET'])
def system_status():
    """Get comprehensive system status."""
    try:
        monitor = get_system_monitor()
        
        # Get all status information
        health_status = get_health_status()
        metrics_summary = get_performance_metrics(1)  # Last hour
        
        # Get database stats
        try:
            db_stats = DatabaseUtils.get_database_stats()
        except Exception as e:
            logger.warning(f"Could not get database stats: {e}")
            db_stats = {'error': str(e)}
        
        status_data = {
            'health': health_status,
            'metrics': metrics_summary,
            'database': db_stats,
            'uptime': monitor.get_latest_metric('process_cpu'),  # Placeholder for uptime
            'version': '1.0.0',  # Application version
            'environment': 'development'  # Environment
        }
        
        # Determine overall status code
        status_code = 200
        if health_status['status'] == 'critical':
            status_code = 503
        
        return ResponseFormatter.success(
            data=status_data,
            status_code=status_code
        )
        
    except Exception as e:
        logger.error(f"Failed to get system status: {e}")
        return ResponseFormatter.error(
            'Failed to retrieve system status',
            status_code=500
        )


@monitoring_api.route('/errors', methods=['POST'])
def log_client_error():
    """Log client-side errors for monitoring."""
    try:
        error_data = request.get_json()
        
        if not error_data:
            return ResponseFormatter.error('No error data provided', status_code=400)
        
        # Log the client error
        logger.error(f"Client error: {error_data}")
        
        # You could also store this in a database or send to external monitoring
        # For now, just log it
        
        return ResponseFormatter.success(message='Error logged successfully')
        
    except Exception as e:
        logger.error(f"Failed to log client error: {e}")
        return ResponseFormatter.error('Failed to log error')


@monitoring_api.route('/ping', methods=['GET'])
def ping():
    """Simple ping endpoint for basic availability check."""
    return ResponseFormatter.success(
        data={'message': 'pong', 'timestamp': get_system_monitor().get_health_summary()['timestamp']},
        status_code=200
    )


@monitoring_api.route('/ready', methods=['GET'])
def readiness_check():
    """Kubernetes-style readiness check."""
    try:
        monitor = get_system_monitor()
        
        # Check if critical services are ready
        db_health = monitor.check_database_health()
        
        if db_health['status'] == 'critical':
            return ResponseFormatter.error(
                'Service not ready - database unavailable',
                status_code=503
            )
        
        return ResponseFormatter.success(
            data={'status': 'ready'},
            status_code=200
        )
        
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return ResponseFormatter.error(
            'Service not ready',
            status_code=503
        )


@monitoring_api.route('/live', methods=['GET'])
def liveness_check():
    """Kubernetes-style liveness check."""
    try:
        # Basic liveness check - just ensure the application is responding
        return ResponseFormatter.success(
            data={'status': 'alive'},
            status_code=200
        )
        
    except Exception as e:
        logger.error(f"Liveness check failed: {e}")
        return ResponseFormatter.error(
            'Service not alive',
            status_code=503
        )


# Error handlers for monitoring endpoints
@monitoring_api.errorhandler(404)
def monitoring_not_found(error):
    """Handle 404 errors for monitoring endpoints."""
    return ResponseFormatter.error(
        'Monitoring endpoint not found',
        status_code=404
    )


@monitoring_api.errorhandler(500)
def monitoring_internal_error(error):
    """Handle 500 errors for monitoring endpoints."""
    logger.error(f"Internal error in monitoring endpoint: {error}")
    return ResponseFormatter.error(
        'Internal monitoring error',
        status_code=500
    )
