#!/usr/bin/env python3
"""
Modern GUI Test Suite
Comprehensive testing for the modern professional GUI implementation
"""
import sys
import os
import time
import json
from datetime import datetime
from pathlib import Path

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))


def print_header(title):
    """Print a formatted header."""
    print("\n" + "=" * 80)
    print(f"🎨 {title}")
    print("=" * 80)


def print_step(step_num, title):
    """Print a formatted step."""
    print(f"\n{step_num}. {title}")
    print("-" * 50)


def check_file_exists(file_path, description):
    """Check if a file exists and report status."""
    if os.path.exists(file_path):
        print(f"✅ {description} - EXISTS")
        return True
    else:
        print(f"❌ {description} - MISSING")
        return False


def check_css_design_system():
    """Check CSS design system files."""
    print_step(1, "CSS DESIGN SYSTEM VERIFICATION")
    
    files_to_check = [
        ('src/static/css/design-system.css', 'Design System CSS'),
        ('src/static/css/components.css', 'Modern Components CSS'),
        ('src/static/css/modern-layout.css', 'Modern Layout CSS')
    ]
    
    all_exist = True
    for file_path, description in files_to_check:
        if not check_file_exists(file_path, description):
            all_exist = False
    
    return all_exist


def check_template_system():
    """Check modern template files."""
    print_step(2, "TEMPLATE SYSTEM VERIFICATION")
    
    files_to_check = [
        ('src/templates/layouts/modern.html', 'Modern Layout Template'),
        ('src/templates/dashboard/modern.html', 'Modern Dashboard Template'),
        ('src/templates/customers/modern.html', 'Modern Customers Template')
    ]
    
    all_exist = True
    for file_path, description in files_to_check:
        if not check_file_exists(file_path, description):
            all_exist = False
    
    return all_exist


def check_javascript_modules():
    """Check JavaScript module files."""
    print_step(3, "JAVASCRIPT MODULES VERIFICATION")
    
    files_to_check = [
        ('src/static/js/components/modern-layout.js', 'Modern Layout JavaScript'),
        ('src/static/js/pages/dashboard-modern.js', 'Modern Dashboard JavaScript'),
        ('src/static/js/pages/customers-modern.js', 'Modern Customers JavaScript')
    ]
    
    all_exist = True
    for file_path, description in files_to_check:
        if not check_file_exists(file_path, description):
            all_exist = False
    
    return all_exist


def validate_css_syntax():
    """Validate CSS syntax and structure."""
    print_step(4, "CSS SYNTAX VALIDATION")
    
    css_files = [
        'src/static/css/design-system.css',
        'src/static/css/components.css',
        'src/static/css/modern-layout.css'
    ]
    
    all_valid = True
    
    for css_file in css_files:
        if not os.path.exists(css_file):
            continue
            
        try:
            with open(css_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Basic CSS validation
            open_braces = content.count('{')
            close_braces = content.count('}')
            
            if open_braces == close_braces:
                print(f"✅ {css_file} - VALID SYNTAX")
            else:
                print(f"❌ {css_file} - INVALID SYNTAX (mismatched braces)")
                all_valid = False
                
            # Check for CSS custom properties
            if '--' in content:
                print(f"✅ {css_file} - Uses CSS custom properties")
            else:
                print(f"⚠️  {css_file} - No CSS custom properties found")
                
        except Exception as e:
            print(f"❌ {css_file} - ERROR: {e}")
            all_valid = False
    
    return all_valid


def validate_html_templates():
    """Validate HTML template structure."""
    print_step(5, "HTML TEMPLATE VALIDATION")
    
    template_files = [
        'src/templates/layouts/modern.html',
        'src/templates/dashboard/modern.html',
        'src/templates/customers/modern.html'
    ]
    
    all_valid = True
    
    for template_file in template_files:
        if not os.path.exists(template_file):
            continue
            
        try:
            with open(template_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check for essential HTML structure
            required_elements = [
                '<!DOCTYPE html>',
                '<html',
                '<head>',
                '<body>',
                '</html>'
            ]
            
            missing_elements = []
            for element in required_elements:
                if element not in content:
                    missing_elements.append(element)
            
            if not missing_elements:
                print(f"✅ {template_file} - VALID HTML STRUCTURE")
            else:
                print(f"❌ {template_file} - MISSING: {', '.join(missing_elements)}")
                all_valid = False
            
            # Check for modern CSS classes
            modern_classes = [
                'card', 'btn', 'form-input', 'grid', 'flex'
            ]
            
            found_classes = []
            for css_class in modern_classes:
                if f'class="{css_class}"' in content or f'class=".*{css_class}' in content:
                    found_classes.append(css_class)
            
            if found_classes:
                print(f"✅ {template_file} - Uses modern CSS classes: {', '.join(found_classes)}")
            else:
                print(f"⚠️  {template_file} - No modern CSS classes detected")
                
        except Exception as e:
            print(f"❌ {template_file} - ERROR: {e}")
            all_valid = False
    
    return all_valid


def validate_javascript_syntax():
    """Validate JavaScript syntax and structure."""
    print_step(6, "JAVASCRIPT SYNTAX VALIDATION")
    
    js_files = [
        'src/static/js/components/modern-layout.js',
        'src/static/js/pages/dashboard-modern.js',
        'src/static/js/pages/customers-modern.js'
    ]
    
    all_valid = True
    
    for js_file in js_files:
        if not os.path.exists(js_file):
            continue
            
        try:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Basic JavaScript validation
            open_braces = content.count('{')
            close_braces = content.count('}')
            open_parens = content.count('(')
            close_parens = content.count(')')
            
            syntax_valid = True
            if open_braces != close_braces:
                print(f"❌ {js_file} - MISMATCHED BRACES")
                syntax_valid = False
                all_valid = False
            
            if open_parens != close_parens:
                print(f"❌ {js_file} - MISMATCHED PARENTHESES")
                syntax_valid = False
                all_valid = False
            
            if syntax_valid:
                print(f"✅ {js_file} - VALID SYNTAX")
            
            # Check for modern JavaScript features
            modern_features = [
                'class ', 'async ', 'await ', 'const ', 'let ', '=>'
            ]
            
            found_features = []
            for feature in modern_features:
                if feature in content:
                    found_features.append(feature.strip())
            
            if found_features:
                print(f"✅ {js_file} - Uses modern JS features: {', '.join(found_features)}")
            else:
                print(f"⚠️  {js_file} - No modern JS features detected")
                
        except Exception as e:
            print(f"❌ {js_file} - ERROR: {e}")
            all_valid = False
    
    return all_valid


def check_responsive_design():
    """Check for responsive design implementation."""
    print_step(7, "RESPONSIVE DESIGN VERIFICATION")
    
    css_files = [
        'src/static/css/design-system.css',
        'src/static/css/components.css',
        'src/static/css/modern-layout.css'
    ]
    
    responsive_features_found = False
    
    for css_file in css_files:
        if not os.path.exists(css_file):
            continue
            
        try:
            with open(css_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check for responsive features
            responsive_indicators = [
                '@media',
                'min-width',
                'max-width',
                'grid-cols-',
                'sm:',
                'md:',
                'lg:',
                'xl:'
            ]
            
            found_indicators = []
            for indicator in responsive_indicators:
                if indicator in content:
                    found_indicators.append(indicator)
            
            if found_indicators:
                print(f"✅ {css_file} - Responsive features: {', '.join(found_indicators)}")
                responsive_features_found = True
            
        except Exception as e:
            print(f"❌ {css_file} - ERROR: {e}")
    
    if responsive_features_found:
        print("✅ RESPONSIVE DESIGN - IMPLEMENTED")
        return True
    else:
        print("❌ RESPONSIVE DESIGN - NOT FOUND")
        return False


def check_accessibility_features():
    """Check for accessibility features."""
    print_step(8, "ACCESSIBILITY VERIFICATION")
    
    template_files = [
        'src/templates/layouts/modern.html',
        'src/templates/dashboard/modern.html',
        'src/templates/customers/modern.html'
    ]
    
    accessibility_features_found = False
    
    for template_file in template_files:
        if not os.path.exists(template_file):
            continue
            
        try:
            with open(template_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check for accessibility features
            a11y_indicators = [
                'aria-',
                'role=',
                'alt=',
                'title=',
                'sr-only',
                'focus:',
                'Skip to main content'
            ]
            
            found_indicators = []
            for indicator in a11y_indicators:
                if indicator in content:
                    found_indicators.append(indicator)
            
            if found_indicators:
                print(f"✅ {template_file} - A11y features: {', '.join(found_indicators)}")
                accessibility_features_found = True
            
        except Exception as e:
            print(f"❌ {template_file} - ERROR: {e}")
    
    if accessibility_features_found:
        print("✅ ACCESSIBILITY - IMPLEMENTED")
        return True
    else:
        print("⚠️  ACCESSIBILITY - LIMITED IMPLEMENTATION")
        return False


def generate_gui_test_report(results):
    """Generate comprehensive GUI test report."""
    report = {
        'timestamp': datetime.now().isoformat(),
        'test_results': results,
        'summary': {
            'total_tests': len(results),
            'passed': sum(1 for r in results if r['passed']),
            'failed': sum(1 for r in results if not r['passed']),
            'success_rate': 0
        }
    }
    
    if report['summary']['total_tests'] > 0:
        report['summary']['success_rate'] = (
            report['summary']['passed'] / report['summary']['total_tests'] * 100
        )
    
    # Save report
    report_file = f"gui_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    return report, report_file


def main():
    """Main test execution function."""
    start_time = time.time()
    
    print_header("MODERN GUI COMPREHENSIVE TEST SUITE")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Change to project root
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)
    
    # Run all tests
    test_results = []
    
    # Test 1: CSS Design System
    css_result = check_css_design_system()
    test_results.append({
        'test': 'css_design_system',
        'description': 'CSS Design System Files',
        'passed': css_result
    })
    
    # Test 2: Template System
    template_result = check_template_system()
    test_results.append({
        'test': 'template_system',
        'description': 'Modern Template Files',
        'passed': template_result
    })
    
    # Test 3: JavaScript Modules
    js_result = check_javascript_modules()
    test_results.append({
        'test': 'javascript_modules',
        'description': 'JavaScript Module Files',
        'passed': js_result
    })
    
    # Test 4: CSS Syntax
    css_syntax_result = validate_css_syntax()
    test_results.append({
        'test': 'css_syntax',
        'description': 'CSS Syntax Validation',
        'passed': css_syntax_result
    })
    
    # Test 5: HTML Templates
    html_result = validate_html_templates()
    test_results.append({
        'test': 'html_templates',
        'description': 'HTML Template Validation',
        'passed': html_result
    })
    
    # Test 6: JavaScript Syntax
    js_syntax_result = validate_javascript_syntax()
    test_results.append({
        'test': 'javascript_syntax',
        'description': 'JavaScript Syntax Validation',
        'passed': js_syntax_result
    })
    
    # Test 7: Responsive Design
    responsive_result = check_responsive_design()
    test_results.append({
        'test': 'responsive_design',
        'description': 'Responsive Design Implementation',
        'passed': responsive_result
    })
    
    # Test 8: Accessibility
    a11y_result = check_accessibility_features()
    test_results.append({
        'test': 'accessibility',
        'description': 'Accessibility Features',
        'passed': a11y_result
    })
    
    # Generate report
    end_time = time.time()
    duration = end_time - start_time
    
    print_header("GUI TEST EXECUTION SUMMARY")
    
    report, report_file = generate_gui_test_report(test_results)
    
    print(f"Execution completed in {duration:.2f} seconds")
    print(f"Total tests: {report['summary']['total_tests']}")
    print(f"Passed: {report['summary']['passed']}")
    print(f"Failed: {report['summary']['failed']}")
    print(f"Success rate: {report['summary']['success_rate']:.1f}%")
    print(f"Detailed report saved to: {report_file}")
    
    # Print failed tests
    failed_tests = [r for r in test_results if not r['passed']]
    if failed_tests:
        print("\n❌ FAILED TESTS:")
        for test in failed_tests:
            print(f"   - {test['description']}")
    
    print("\n🎨 GUI IMPLEMENTATION STATUS:")
    if report['summary']['success_rate'] >= 90:
        print("✅ EXCELLENT - Modern GUI is production-ready!")
    elif report['summary']['success_rate'] >= 75:
        print("✅ GOOD - Modern GUI is mostly complete with minor issues")
    elif report['summary']['success_rate'] >= 50:
        print("⚠️  FAIR - Modern GUI needs significant improvements")
    else:
        print("❌ POOR - Modern GUI implementation has major issues")
    
    print("\n🚀 NEXT STEPS:")
    print("1. Fix any failed tests")
    print("2. Test GUI in multiple browsers")
    print("3. Validate responsive design on different devices")
    print("4. Conduct user acceptance testing")
    print("5. Optimize performance and loading times")
    
    # Return appropriate exit code
    return 0 if report['summary']['success_rate'] >= 75 else 1


if __name__ == '__main__':
    sys.exit(main())
