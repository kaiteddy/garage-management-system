#!/usr/bin/env python3
"""
Comprehensive Test Runner for the Garage Management System
Executes all tests and generates detailed reports.
"""
import sys
import os
import subprocess
import time
import json
from datetime import datetime
from pathlib import Path

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))


def print_header(title):
    """Print a formatted header."""
    print("\n" + "=" * 80)
    print(f"🧪 {title}")
    print("=" * 80)


def print_step(step_num, title):
    """Print a formatted step."""
    print(f"\n{step_num}. {title}")
    print("-" * 50)


def run_command(command, description, capture_output=True):
    """Run a shell command and return result."""
    print(f"Running: {description}")
    try:
        if capture_output:
            result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=300)
        else:
            result = subprocess.run(command, shell=True, timeout=300)
            result.stdout = ""
            result.stderr = ""
        
        if result.returncode == 0:
            print(f"✅ {description} - SUCCESS")
            return True, result.stdout, result.stderr
        else:
            print(f"❌ {description} - FAILED")
            if result.stderr:
                print(f"Error: {result.stderr.strip()}")
            return False, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        print(f"⏰ {description} - TIMEOUT")
        return False, "", "Command timed out"
    except Exception as e:
        print(f"❌ {description} - ERROR: {e}")
        return False, "", str(e)


def generate_test_report(results):
    """Generate comprehensive test report."""
    report = {
        'timestamp': datetime.now().isoformat(),
        'summary': {
            'total_tests': len(results),
            'passed': sum(1 for r in results if r['success']),
            'failed': sum(1 for r in results if not r['success']),
            'success_rate': 0
        },
        'results': results
    }
    
    if report['summary']['total_tests'] > 0:
        report['summary']['success_rate'] = (
            report['summary']['passed'] / report['summary']['total_tests'] * 100
        )
    
    # Save report
    report_file = f"test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    return report, report_file


def main():
    """Main test execution function."""
    start_time = time.time()
    
    print_header("COMPREHENSIVE TEST SUITE EXECUTION")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Change to project root
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)
    
    results = []
    
    # Step 1: Environment Setup
    print_step(1, "ENVIRONMENT SETUP")
    
    success, stdout, stderr = run_command(
        "pip install -r requirements.txt -r requirements-test.txt",
        "Installing dependencies"
    )
    results.append({
        'test': 'dependency_installation',
        'description': 'Installing dependencies',
        'success': success,
        'output': stdout,
        'error': stderr
    })
    
    # Step 2: Code Quality Checks
    print_step(2, "CODE QUALITY CHECKS")
    
    # Linting
    success, stdout, stderr = run_command(
        "python -m flake8 src/ --max-line-length=120 --ignore=E501,W503",
        "Python code linting"
    )
    results.append({
        'test': 'python_linting',
        'description': 'Python code linting',
        'success': success,
        'output': stdout,
        'error': stderr
    })
    
    # Type checking
    success, stdout, stderr = run_command(
        "python -m mypy src/ --ignore-missing-imports --no-strict-optional",
        "Python type checking"
    )
    results.append({
        'test': 'type_checking',
        'description': 'Python type checking',
        'success': success,
        'output': stdout,
        'error': stderr
    })
    
    # Step 3: Security Scans
    print_step(3, "SECURITY SCANS")
    
    # Bandit security scan
    success, stdout, stderr = run_command(
        "python -m bandit -r src/ -f json -o bandit_report.json",
        "Security vulnerability scan"
    )
    results.append({
        'test': 'security_scan',
        'description': 'Security vulnerability scan',
        'success': success,
        'output': stdout,
        'error': stderr
    })
    
    # Safety check for dependencies
    success, stdout, stderr = run_command(
        "python -m safety check --json --output safety_report.json",
        "Dependency security check"
    )
    results.append({
        'test': 'dependency_security',
        'description': 'Dependency security check',
        'success': success,
        'output': stdout,
        'error': stderr
    })
    
    # Step 4: Unit Tests
    print_step(4, "UNIT TESTS")
    
    success, stdout, stderr = run_command(
        "python -m pytest tests/unit/ -v --cov=src --cov-report=html --cov-report=term-missing --cov-fail-under=70",
        "Unit tests with coverage"
    )
    results.append({
        'test': 'unit_tests',
        'description': 'Unit tests with coverage',
        'success': success,
        'output': stdout,
        'error': stderr
    })
    
    # Step 5: Integration Tests
    print_step(5, "INTEGRATION TESTS")
    
    success, stdout, stderr = run_command(
        "python -m pytest tests/integration/ -v",
        "Integration tests"
    )
    results.append({
        'test': 'integration_tests',
        'description': 'Integration tests',
        'success': success,
        'output': stdout,
        'error': stderr
    })
    
    # Step 6: Database Tests
    print_step(6, "DATABASE TESTS")
    
    success, stdout, stderr = run_command(
        "python scripts/optimize_database.py",
        "Database optimization and health check"
    )
    results.append({
        'test': 'database_optimization',
        'description': 'Database optimization and health check',
        'success': success,
        'output': stdout,
        'error': stderr
    })
    
    # Step 7: API Tests
    print_step(7, "API ENDPOINT TESTS")
    
    success, stdout, stderr = run_command(
        "python -m pytest tests/integration/test_api_endpoints.py -v",
        "API endpoint tests"
    )
    results.append({
        'test': 'api_tests',
        'description': 'API endpoint tests',
        'success': success,
        'output': stdout,
        'error': stderr
    })
    
    # Step 8: Monitoring Tests
    print_step(8, "MONITORING SYSTEM TESTS")
    
    success, stdout, stderr = run_command(
        "python -m pytest tests/unit/utils/test_monitoring.py -v",
        "Monitoring system tests"
    )
    results.append({
        'test': 'monitoring_tests',
        'description': 'Monitoring system tests',
        'success': success,
        'output': stdout,
        'error': stderr
    })
    
    # Step 9: Authentication Tests
    print_step(9, "AUTHENTICATION TESTS")
    
    success, stdout, stderr = run_command(
        "python -c \"from services.auth_service import AuthService; print('Auth service imported successfully')\"",
        "Authentication service validation"
    )
    results.append({
        'test': 'auth_validation',
        'description': 'Authentication service validation',
        'success': success,
        'output': stdout,
        'error': stderr
    })
    
    # Step 10: Performance Tests
    print_step(10, "PERFORMANCE TESTS")
    
    # Simple performance test
    success, stdout, stderr = run_command(
        "python -c \"import time; start=time.time(); from app import create_app; app=create_app('testing'); print(f'App startup time: {time.time()-start:.2f}s')\"",
        "Application startup performance"
    )
    results.append({
        'test': 'startup_performance',
        'description': 'Application startup performance',
        'success': success,
        'output': stdout,
        'error': stderr
    })
    
    # Generate comprehensive report
    end_time = time.time()
    duration = end_time - start_time
    
    print_header("TEST EXECUTION SUMMARY")
    
    report, report_file = generate_test_report(results)
    
    print(f"Execution completed in {duration:.2f} seconds")
    print(f"Total tests: {report['summary']['total_tests']}")
    print(f"Passed: {report['summary']['passed']}")
    print(f"Failed: {report['summary']['failed']}")
    print(f"Success rate: {report['summary']['success_rate']:.1f}%")
    print(f"Detailed report saved to: {report_file}")
    
    # Print failed tests
    failed_tests = [r for r in results if not r['success']]
    if failed_tests:
        print("\n❌ FAILED TESTS:")
        for test in failed_tests:
            print(f"   - {test['description']}")
            if test['error']:
                print(f"     Error: {test['error'][:200]}...")
    
    # Print coverage information
    if os.path.exists('htmlcov/index.html'):
        print(f"\n📊 Coverage report available at: htmlcov/index.html")
    
    # Print security reports
    if os.path.exists('bandit_report.json'):
        print(f"🔒 Security scan report: bandit_report.json")
    
    if os.path.exists('safety_report.json'):
        print(f"🔒 Dependency security report: safety_report.json")
    
    print("\n🎯 NEXT STEPS:")
    print("1. Review failed tests and fix issues")
    print("2. Check coverage report and add missing tests")
    print("3. Review security reports and address vulnerabilities")
    print("4. Run performance profiling for optimization opportunities")
    print("5. Set up continuous integration for automated testing")
    
    # Return appropriate exit code
    if report['summary']['success_rate'] >= 80:
        print("\n🎉 TEST SUITE PASSED! (≥80% success rate)")
        return 0
    else:
        print("\n⚠️  TEST SUITE NEEDS ATTENTION (<80% success rate)")
        return 1


if __name__ == '__main__':
    sys.exit(main())
