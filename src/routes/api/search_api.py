"""
Intelligent Search API Routes
Provides fuzzy search, multi-field search, and data linking capabilities
"""

import os
import time
from flask import Blueprint, jsonify, request
from services.intelligent_search import IntelligentSearchEngine
from services.search_optimization import SearchOptimizer
from services.intelligent_data_linking import IntelligentDataLinker

search_api_bp = Blueprint('search_api', __name__)

def get_db_path():
    """Get database path"""
    # Get the project root directory (3 levels up from src/routes/api/)
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    return os.path.join(project_root, 'instance', 'garage.db')

def get_search_engine():
    """Get search engine instance"""
    return IntelligentSearchEngine(get_db_path())

@search_api_bp.route('/api/search/customers')
def search_customers():
    """Search customers with intelligent matching"""
    try:
        query = request.args.get('q', '').strip()
        limit = min(int(request.args.get('limit', 20)), 100)  # Max 100 results
        
        if not query or len(query) < 2:
            return jsonify({
                'success': False,
                'error': 'Query must be at least 2 characters long'
            }), 400
        
        start_time = time.time()
        search_engine = get_search_engine()
        results = search_engine.search_customers(query, limit)
        search_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        return jsonify({
            'success': True,
            'query': query,
            'results': results,
            'count': len(results),
            'search_time_ms': round(search_time, 2)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@search_api_bp.route('/api/search/vehicles')
def search_vehicles():
    """Search vehicles with intelligent matching"""
    try:
        query = request.args.get('q', '').strip()
        limit = min(int(request.args.get('limit', 20)), 100)  # Max 100 results
        
        if not query or len(query) < 2:
            return jsonify({
                'success': False,
                'error': 'Query must be at least 2 characters long'
            }), 400
        
        start_time = time.time()
        search_engine = get_search_engine()
        results = search_engine.search_vehicles(query, limit)
        search_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        return jsonify({
            'success': True,
            'query': query,
            'results': results,
            'count': len(results),
            'search_time_ms': round(search_time, 2)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@search_api_bp.route('/api/search/jobs')
def search_jobs():
    """Search jobs with intelligent matching"""
    try:
        query = request.args.get('q', '').strip()
        limit = min(int(request.args.get('limit', 20)), 100)  # Max 100 results
        
        if not query or len(query) < 2:
            return jsonify({
                'success': False,
                'error': 'Query must be at least 2 characters long'
            }), 400
        
        start_time = time.time()
        search_engine = get_search_engine()
        results = search_engine.search_jobs(query, limit)
        search_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        return jsonify({
            'success': True,
            'query': query,
            'results': results,
            'count': len(results),
            'search_time_ms': round(search_time, 2)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@search_api_bp.route('/api/search/unified')
def unified_search():
    """Perform unified search across multiple entity types"""
    try:
        query = request.args.get('q', '').strip()
        entity_types = request.args.get('types', 'customers,vehicles,jobs').split(',')
        limit = min(int(request.args.get('limit', 10)), 50)  # Max 50 per type
        
        if not query or len(query) < 2:
            return jsonify({
                'success': False,
                'error': 'Query must be at least 2 characters long'
            }), 400
        
        start_time = time.time()
        search_engine = get_search_engine()
        results = search_engine.unified_search(query, entity_types, limit)
        search_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Calculate total results
        total_results = sum(len(results.get(entity_type, [])) for entity_type in entity_types)
        
        return jsonify({
            'success': True,
            'query': query,
            'entity_types': entity_types,
            'results': results,
            'total_results': total_results,
            'search_time_ms': round(search_time, 2)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@search_api_bp.route('/api/search/suggestions')
def search_suggestions():
    """Get search suggestions based on partial input"""
    try:
        query = request.args.get('q', '').strip()
        entity_type = request.args.get('type', 'customers')
        limit = min(int(request.args.get('limit', 5)), 10)  # Max 10 suggestions
        
        if not query or len(query) < 1:
            return jsonify({
                'success': True,
                'suggestions': []
            })
        
        start_time = time.time()
        search_engine = get_search_engine()
        
        # Get search results and extract suggestions
        if entity_type == 'customers':
            results = search_engine.search_customers(query, limit * 2)
            suggestions = []
            for result in results[:limit]:
                suggestions.append({
                    'text': result.get('name', ''),
                    'type': 'customer',
                    'id': result.get('id'),
                    'secondary': result.get('mobile') or result.get('account_number')
                })
        elif entity_type == 'vehicles':
            results = search_engine.search_vehicles(query, limit * 2)
            suggestions = []
            for result in results[:limit]:
                suggestions.append({
                    'text': result.get('registration', ''),
                    'type': 'vehicle',
                    'id': result.get('id'),
                    'secondary': f"{result.get('make', '')} {result.get('model', '')}".strip()
                })
        else:
            suggestions = []
        
        search_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        return jsonify({
            'success': True,
            'query': query,
            'suggestions': suggestions,
            'search_time_ms': round(search_time, 2)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@search_api_bp.route('/api/search/link-customers', methods=['POST'])
def find_customer_links():
    """Find potential customer matches for data linking"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        threshold = float(data.get('threshold', 0.8))
        customer_data = data.get('customer_data', {})
        
        if not customer_data:
            return jsonify({
                'success': False,
                'error': 'Customer data is required'
            }), 400
        
        start_time = time.time()
        search_engine = get_search_engine()
        matches = search_engine.find_customer_matches(customer_data, threshold)
        search_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Format matches for response
        formatted_matches = []
        for customer_id, score in matches:
            formatted_matches.append({
                'customer_id': customer_id,
                'confidence_score': round(score, 3)
            })
        
        return jsonify({
            'success': True,
            'matches': formatted_matches,
            'count': len(formatted_matches),
            'threshold': threshold,
            'search_time_ms': round(search_time, 2)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@search_api_bp.route('/api/search/link-vehicles', methods=['POST'])
def find_vehicle_links():
    """Find potential vehicle matches for data linking"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        threshold = float(data.get('threshold', 0.9))
        vehicle_data = data.get('vehicle_data', {})
        
        if not vehicle_data:
            return jsonify({
                'success': False,
                'error': 'Vehicle data is required'
            }), 400
        
        start_time = time.time()
        search_engine = get_search_engine()
        matches = search_engine.find_vehicle_matches(vehicle_data, threshold)
        search_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Format matches for response
        formatted_matches = []
        for vehicle_id, score in matches:
            formatted_matches.append({
                'vehicle_id': vehicle_id,
                'confidence_score': round(score, 3)
            })
        
        return jsonify({
            'success': True,
            'matches': formatted_matches,
            'count': len(formatted_matches),
            'threshold': threshold,
            'search_time_ms': round(search_time, 2)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@search_api_bp.route('/api/search/optimize', methods=['POST'])
def optimize_search():
    """Optimize database for search performance"""
    try:
        start_time = time.time()
        optimizer = SearchOptimizer(get_db_path())
        results = optimizer.run_full_optimization()
        optimization_time = (time.time() - start_time) * 1000  # Convert to milliseconds

        return jsonify({
            'success': True,
            'results': results,
            'optimization_time_ms': round(optimization_time, 2)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@search_api_bp.route('/api/search/stats')
def search_stats():
    """Get search performance statistics"""
    try:
        optimizer = SearchOptimizer(get_db_path())
        stats = optimizer.get_search_performance_stats()

        return jsonify({
            'success': True,
            'stats': stats
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@search_api_bp.route('/api/search/import-with-linking', methods=['POST'])
def import_with_intelligent_linking():
    """Import data with intelligent linking"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        entity_type = data.get('entity_type')
        records = data.get('records', [])
        confidence_threshold = float(data.get('confidence_threshold', 0.8))

        if not entity_type or not records:
            return jsonify({
                'success': False,
                'error': 'entity_type and records are required'
            }), 400

        start_time = time.time()
        linker = IntelligentDataLinker(get_db_path())

        if entity_type == 'customers':
            results = linker.import_customers_with_linking(records, confidence_threshold)
        elif entity_type == 'vehicles':
            results = linker.import_vehicles_with_linking(records, confidence_threshold)
        elif entity_type == 'jobs':
            results = linker.import_jobs_with_linking(records)
        else:
            return jsonify({
                'success': False,
                'error': f'Unsupported entity type: {entity_type}'
            }), 400

        import_time = (time.time() - start_time) * 1000  # Convert to milliseconds

        # Add statistics
        stats = linker.get_linking_statistics()

        return jsonify({
            'success': results['success'],
            'results': results,
            'statistics': stats,
            'import_time_ms': round(import_time, 2)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
