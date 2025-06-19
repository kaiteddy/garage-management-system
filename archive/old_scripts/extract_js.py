#!/usr/bin/env python3
"""
Extract JavaScript from HTML file to check for syntax errors
"""

import re
import sys

def extract_javascript(html_file):
    """Extract JavaScript code from HTML file"""
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all script tags
    script_pattern = r'<script[^>]*>(.*?)</script>'
    scripts = re.findall(script_pattern, content, re.DOTALL)
    
    # Combine all JavaScript
    js_content = '\n'.join(scripts)
    
    return js_content

def check_basic_syntax(js_content):
    """Basic syntax checks"""
    issues = []
    
    # Check for unmatched braces
    open_braces = js_content.count('{')
    close_braces = js_content.count('}')
    if open_braces != close_braces:
        issues.append(f"Unmatched braces: {open_braces} open, {close_braces} close")
    
    # Check for unmatched parentheses
    open_parens = js_content.count('(')
    close_parens = js_content.count(')')
    if open_parens != close_parens:
        issues.append(f"Unmatched parentheses: {open_parens} open, {close_parens} close")
    
    # Check for unmatched brackets
    open_brackets = js_content.count('[')
    close_brackets = js_content.count(']')
    if open_brackets != close_brackets:
        issues.append(f"Unmatched brackets: {open_brackets} open, {close_brackets} close")
    
    # Look for common syntax errors
    lines = js_content.split('\n')
    for i, line in enumerate(lines, 1):
        line = line.strip()
        if line.endswith(',}') or line.endswith(',]'):
            issues.append(f"Line {i}: Trailing comma before closing brace/bracket")
        if line.count('"') % 2 != 0 and line.count("'") % 2 != 0:
            issues.append(f"Line {i}: Unmatched quotes")
    
    return issues

if __name__ == '__main__':
    html_file = 'src/static/index.html'
    
    try:
        js_content = extract_javascript(html_file)
        print(f"Extracted {len(js_content)} characters of JavaScript")
        
        # Save extracted JS for inspection
        with open('extracted_js.js', 'w', encoding='utf-8') as f:
            f.write(js_content)
        print("JavaScript saved to extracted_js.js")
        
        # Check basic syntax
        issues = check_basic_syntax(js_content)
        
        if issues:
            print("\n🚨 SYNTAX ISSUES FOUND:")
            for issue in issues:
                print(f"  ❌ {issue}")
        else:
            print("\n✅ No obvious syntax issues found")
            
        # Look for function definitions
        function_pattern = r'function\s+(\w+)\s*\('
        functions = re.findall(function_pattern, js_content)
        print(f"\n📋 Found {len(functions)} function definitions:")
        for func in functions[:10]:  # Show first 10
            print(f"  - {func}")
        if len(functions) > 10:
            print(f"  ... and {len(functions) - 10} more")
            
        # Check if showPage is defined
        if 'function showPage' in js_content:
            print("\n✅ showPage function definition found")
        else:
            print("\n❌ showPage function definition NOT found")
            
    except Exception as e:
        print(f"Error: {e}")
