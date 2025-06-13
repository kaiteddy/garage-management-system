#!/usr/bin/env python3
"""
Simple launch script for the Garage Management System
"""
import os
import sys
from datetime import datetime

def print_banner():
    """Print launch banner."""
    banner = """
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║    🚀 GARAGE MANAGEMENT SYSTEM - QUICK LAUNCH 🚀            ║
    ║                                                              ║
    ║    Modern Professional Interface • Production Ready          ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
    """
    print(banner)
    print(f"🕒 Launch initiated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)

def main():
    """Main launch function."""
    print_banner()
    
    # Change to src directory
    src_dir = os.path.join(os.path.dirname(__file__), 'src')
    if os.path.exists(src_dir):
        os.chdir(src_dir)
        sys.path.insert(0, src_dir)
    
    try:
        print("🔄 Initializing Flask application...")
        
        # Import and create the app
        from app import create_app
        app = create_app('development')
        
        print("✅ Application initialized successfully!")
        print("\n🌐 Starting development server...")
        print("📍 URL: http://localhost:5000")
        print("🎨 Modern GUI Demo: http://localhost:5000/demo")
        print("\n💡 Features available:")
        print("   • Modern Professional Dashboard")
        print("   • Customer Management with Advanced Search")
        print("   • Responsive Design (Mobile/Tablet/Desktop)")
        print("   • Real-time Monitoring")
        print("   • Beautiful UI Components")
        print("\n🛑 Press Ctrl+C to stop the server")
        print("=" * 80)
        
        # Start the development server
        app.run(
            host='0.0.0.0',
            port=5000,
            debug=True,
            use_reloader=True
        )
        
    except ImportError as e:
        print(f"❌ Import Error: {e}")
        print("\n🔧 Trying alternative launch method...")
        
        # Alternative launch using simple Flask app
        try:
            from flask import Flask, render_template, send_from_directory
            
            app = Flask(__name__, template_folder='templates', static_folder='static')
            app.config['SECRET_KEY'] = 'dev-secret-key'
            
            @app.route('/')
            def index():
                return render_template('dashboard/modern.html')
            
            @app.route('/demo')
            def demo():
                return send_from_directory('..', 'demo_modern_gui.html')
            
            @app.route('/customers')
            def customers():
                return render_template('customers/modern.html')
            
            @app.errorhandler(404)
            def not_found(error):
                return f"<h1>Page not found</h1><p>Try <a href='/demo'>the demo page</a></p>", 404
            
            print("✅ Alternative Flask app created!")
            print("🌐 Starting on http://localhost:5000")
            
            app.run(host='0.0.0.0', port=5000, debug=True)
            
        except Exception as e:
            print(f"❌ Failed to start alternative app: {e}")
            return 1
    
    except Exception as e:
        print(f"❌ Application Error: {e}")
        print("\n🆘 Troubleshooting:")
        print("   1. Check that all dependencies are installed")
        print("   2. Ensure you're in the correct directory")
        print("   3. Try running: pip install -r requirements.txt")
        return 1
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
