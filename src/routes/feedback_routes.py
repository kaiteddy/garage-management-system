from flask import Blueprint, request, jsonify
import os
import base64
from datetime import datetime

feedback_bp = Blueprint('feedback', __name__)

# Use a path relative to the app directory
FEEDBACK_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'feedback_screenshots')
os.makedirs(FEEDBACK_DIR, exist_ok=True)

@feedback_bp.route('/api/feedback', methods=['POST'])
def receive_feedback():
    data = request.get_json()
    image_data = data.get('image')
    route = data.get('route')
    time = data.get('time')
    build = data.get('build')
    user_agent = data.get('userAgent')
    feedback_text = data.get('feedback', '')

    if not image_data or not image_data.startswith('data:image/png;base64,'):
        return jsonify({'error': 'Invalid image data'}), 400

    # Remove the base64 header
    image_base64 = image_data.split(',')[1]
    dt = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'feedback_{dt}.png'
    filepath = os.path.join(FEEDBACK_DIR, filename)

    with open(filepath, 'wb') as f:
        f.write(base64.b64decode(image_base64))

    # Log metadata and feedback
    with open(os.path.join(FEEDBACK_DIR, 'feedback_log.txt'), 'a') as log:
        log.write(f'{dt} | {route} | {build} | {user_agent} | {feedback_text}\n')

    return jsonify({'status': 'success', 'filename': filename}) 