#!/usr/bin/env python3
"""
Garage Management System Launcher
Starts the modern professional interface
"""
import os
import sys
import time
import subprocess
import webbrowser
from datetime import datetime

def print_banner():
    """Print the launch banner."""
    banner = """
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║    🚀 GARAGE MANAGEMENT SYSTEM - LAUNCH SEQUENCE 🚀         ║
    ║                                                              ║
    ║    Professional • Modern • Production-Ready                  ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
    """
    print(banner)
    print(f"🕒 Launch initiated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)

def check_dependencies():
    """Check if required dependencies are available."""
    print("🔍 Checking dependencies...")
    
    try:
        import flask
        print(f"   ✅ Flask {flask.__version__} - OK")
    except ImportError:
        print("   ❌ Flask not found - Installing...")
        subprocess.run([sys.executable, "-m", "pip", "install", "flask"], check=True)
        print("   ✅ Flask installed successfully")
    
    return True

def start_demo_server():
    """Start the demo server."""
    print("🚀 Starting Garage Management System...")
    print("   📍 Server URL: http://localhost:5000")
    print("   🎨 Modern Dashboard: http://localhost:5000/")
    print("   👥 Customer Management: http://localhost:5000/customers")
    print("   🎯 Component Demo: http://localhost:5000/demo")
    print()
    print("✨ FEATURES AVAILABLE:")
    print("   • Beautiful Modern Professional Interface")
    print("   • Responsive Design (Mobile/Tablet/Desktop)")
    print("   • Real-time Dashboard with Interactive Charts")
    print("   • Advanced Customer Management with Search")
    print("   • Professional UI Component Library")
    print("   • System Monitoring and Health Checks")
    print()
    print("🛑 Press Ctrl+C to stop the server")
    print("=" * 80)
    
    # Start the server
    try:
        # Import and run the demo server
        exec(open('demo_server.py').read())
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
        print("Thank you for using the Garage Management System!")
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        return False
    
    return True

def open_browser():
    """Open the browser to the application."""
    try:
        time.sleep(2)  # Wait for server to start
        webbrowser.open('http://localhost:5000')
        print("🌐 Browser opened automatically")
    except Exception as e:
        print(f"⚠️  Could not open browser automatically: {e}")
        print("   Please manually open: http://localhost:5000")

def main():
    """Main launch function."""
    print_banner()
    
    # Change to the correct directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    try:
        # Check dependencies
        if not check_dependencies():
            print("❌ Dependency check failed")
            return 1
        
        print("✅ All dependencies satisfied")
        print()
        
        # Start the server
        start_demo_server()
        
    except KeyboardInterrupt:
        print("\n\n🛑 Launch cancelled by user")
        return 0
    except Exception as e:
        print(f"\n❌ Launch failed: {e}")
        print("\n🆘 Troubleshooting:")
        print("   1. Ensure you're in the garage-management-system directory")
        print("   2. Check that Python 3.8+ is installed")
        print("   3. Try: pip install flask")
        print("   4. Contact support if issues persist")
        return 1
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
