#!/usr/bin/env python3
"""
Automated Fix Engine for Garage Management System
Handles complex fixes that require source code modification
"""

import json
import logging
import os
import re
import shutil
from datetime import datetime
from typing import Dict, List, Optional, Tuple


class AutomatedFixEngine:
    """
    Advanced error fixing engine that can modify source code
    """

    def __init__(self, project_root: str = None):
        self.project_root = project_root or os.path.dirname(
            os.path.dirname(__file__))
        self.backup_dir = os.path.join(
            self.project_root, 'backups', 'automated_fixes')
        self.fix_log = os.path.join(
            self.project_root, 'logs', 'automated_fixes.json')

        # Ensure directories exist
        os.makedirs(self.backup_dir, exist_ok=True)
        os.makedirs(os.path.dirname(self.fix_log), exist_ok=True)

        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(os.path.join(
                    self.project_root, 'logs', 'fix_engine.log')),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

        # Initialize fix strategies
        self.fix_strategies = {
            'duplicate_variable_declaration': self.fix_duplicate_variable,
            'missing_null_check': self.add_null_checks,
            'undefined_function': self.add_function_stub,
            'missing_import': self.add_missing_import,
            'syntax_error': self.fix_syntax_error
        }

    def analyze_error_reports(self) -> List[Dict]:
        """
        Analyze error reports and identify fixable issues
        """
        try:
            if not os.path.exists(self.fix_log):
                return []

            with open(self.fix_log, 'r') as f:
                reports = json.load(f)

            # Filter for errors that need source code fixes
            fixable_errors = []
            for report in reports:
                error_data = report.get('report', {}).get('error', {})
                if self.is_fixable_error(error_data):
                    fixable_errors.append(report)

            return fixable_errors

        except Exception as e:
            self.logger.error(f"Error analyzing reports: {e}")
            return []

    def is_fixable_error(self, error_data: Dict) -> bool:
        """
        Determine if an error can be automatically fixed
        """
        message = error_data.get('message', '').lower()

        fixable_patterns = [
            'cannot declare.*twice',
            'identifier.*already been declared',
            'null is not an object',
            'undefined is not a function',
            'is not defined',
            'missing import',
            'syntax error'
        ]

        return any(re.search(pattern, message, re.IGNORECASE) for pattern in fixable_patterns)

    def apply_fixes(self, max_fixes: int = 10) -> Dict:
        """
        Apply automated fixes to identified issues
        """
        fixable_errors = self.analyze_error_reports()

        if not fixable_errors:
            self.logger.info("No fixable errors found")
            return {'fixes_applied': 0, 'errors': []}

        fixes_applied = 0
        fix_results = []

        for error_report in fixable_errors[:max_fixes]:
            try:
                result = self.apply_single_fix(error_report)
                fix_results.append(result)

                if result.get('success'):
                    fixes_applied += 1

            except Exception as e:
                self.logger.error(f"Error applying fix: {e}")
                fix_results.append({
                    'success': False,
                    'error': str(e),
                    'report': error_report
                })

        return {
            'fixes_applied': fixes_applied,
            'total_attempts': len(fix_results),
            'results': fix_results
        }

    def apply_single_fix(self, error_report: Dict) -> Dict:
        """
        Apply a single fix based on error report
        """
        error_data = error_report.get('report', {}).get('error', {})
        message = error_data.get('message', '')
        filename = error_data.get('filename', '')

        # Determine fix strategy
        strategy = self.determine_fix_strategy(message)
        if not strategy:
            return {
                'success': False,
                'reason': 'No applicable fix strategy found',
                'message': message
            }

        # Create backup before fixing
        backup_path = self.create_backup(filename)

        try:
            # Apply the fix
            fix_result = self.fix_strategies[strategy](error_data)

            if fix_result.get('success'):
                self.log_fix_applied(error_report, fix_result, backup_path)

            return fix_result

        except Exception as e:
            # Restore from backup if fix failed
            if backup_path and os.path.exists(backup_path):
                shutil.copy2(backup_path, filename)

            return {
                'success': False,
                'reason': f'Fix failed: {str(e)}',
                'backup_restored': backup_path is not None
            }

    def determine_fix_strategy(self, message: str) -> Optional[str]:
        """
        Determine which fix strategy to use based on error message
        """
        message_lower = message.lower()

        if re.search(r'cannot declare.*twice|identifier.*already been declared', message_lower):
            return 'duplicate_variable_declaration'
        elif 'null is not an object' in message_lower:
            return 'missing_null_check'
        elif re.search(r'undefined is not a function|is not defined', message_lower):
            return 'undefined_function'
        elif 'missing import' in message_lower:
            return 'missing_import'
        elif 'syntax error' in message_lower:
            return 'syntax_error'

        return None

    def fix_duplicate_variable(self, error_data: Dict) -> Dict:
        """
        Fix duplicate variable declarations
        """
        filename = error_data.get('filename', '')
        lineno = error_data.get('lineno', 0)
        message = error_data.get('message', '')

        # Extract variable name from error message
        var_match = re.search(r"Cannot declare.*?'(\w+)'", message)
        if not var_match:
            var_match = re.search(
                r'Identifier \'(\w+)\' has already been declared', message)

        if not var_match:
            return {'success': False, 'reason': 'Could not extract variable name'}

        variable_name = var_match.group(1)

        # Read the file
        try:
            with open(filename, 'r') as f:
                lines = f.readlines()

            # Find and remove duplicate declarations
            declarations_found = 0
            modified_lines = []

            for i, line in enumerate(lines):
                if re.search(rf'\b(let|const|var)\s+{re.escape(variable_name)}\b', line):
                    declarations_found += 1
                    if declarations_found > 1:
                        # Comment out the duplicate declaration
                        modified_lines.append(f"// REMOVED DUPLICATE: {line}")
                        continue

                modified_lines.append(line)

            # Write back the modified file
            with open(filename, 'w') as f:
                f.writelines(modified_lines)

            return {
                'success': True,
                'description': f'Removed duplicate declaration of {variable_name}',
                'variable': variable_name,
                'declarations_removed': declarations_found - 1
            }

        except Exception as e:
            return {'success': False, 'reason': f'File operation failed: {str(e)}'}

    def add_null_checks(self, error_data: Dict) -> Dict:
        """
        Add null checks to prevent null object access errors
        """
        filename = error_data.get('filename', '')
        lineno = error_data.get('lineno', 0)
        message = error_data.get('message', '')

        # Extract element access pattern
        element_match = re.search(
            r"getElementById\(['\"](.*?)['\"]\)", message)
        if not element_match:
            element_match = re.search(
                r"querySelector\(['\"](.*?)['\"]\)", message)

        if not element_match:
            return {'success': False, 'reason': 'Could not identify element access pattern'}

        element_selector = element_match.group(1)

        try:
            with open(filename, 'r') as f:
                lines = f.readlines()

            # Find the problematic line and add null check
            if lineno > 0 and lineno <= len(lines):
                original_line = lines[lineno - 1]

                # Add null check wrapper
                indent = len(original_line) - len(original_line.lstrip())
                null_check = ' ' * indent + \
                    f"const element = document.getElementById('{element_selector}');\n"
                null_check += ' ' * indent + "if (element) {\n"

                # Modify the original line to use 'element' instead of direct access
                modified_line = original_line.replace(
                    f"document.getElementById('{element_selector}')",
                    "element"
                )

                # Insert the null check
                lines.insert(lineno - 1, null_check)
                lines[lineno] = modified_line
                lines.insert(lineno + 1, ' ' * indent + "}\n")

                with open(filename, 'w') as f:
                    f.writelines(lines)

                return {
                    'success': True,
                    'description': f'Added null check for element {element_selector}',
                    'element': element_selector,
                    'line': lineno
                }

        except Exception as e:
            return {'success': False, 'reason': f'File operation failed: {str(e)}'}

        return {'success': False, 'reason': 'Could not locate problematic line'}

    def add_function_stub(self, error_data: Dict) -> Dict:
        """
        Add function stubs for undefined functions
        """
        message = error_data.get('message', '')

        # Extract function name
        func_match = re.search(r'(\w+) is not defined', message)
        if not func_match:
            return {'success': False, 'reason': 'Could not extract function name'}

        function_name = func_match.group(1)

        # Common function stubs
        function_stubs = {
            'showPage': 'function showPage(pageId) { console.warn("showPage stub called:", pageId); }',
            'loadCustomers': 'function loadCustomers() { console.warn("loadCustomers stub called"); }',
            'showNotification': 'function showNotification(msg, type) { console.log(`${type}: ${msg}`); }',
            'showModal': 'function showModal(modalId) { console.warn("showModal stub called:", modalId); }',
            'hideModal': 'function hideModal(modalId) { console.warn("hideModal stub called:", modalId); }'
        }

        if function_name not in function_stubs:
            return {'success': False, 'reason': f'No stub available for function {function_name}'}

        # Add to global scope (this would need to be injected into the HTML)
        return {
            'success': True,
            'description': f'Function stub created for {function_name}',
            'function': function_name,
            'stub': function_stubs[function_name],
            'action': 'inject_into_global_scope'
        }

    def create_backup(self, filename: str) -> Optional[str]:
        """
        Create a backup of the file before modification
        """
        if not filename or not os.path.exists(filename):
            return None

        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f"{os.path.basename(filename)}.{timestamp}.backup"
            backup_path = os.path.join(self.backup_dir, backup_filename)

            shutil.copy2(filename, backup_path)
            self.logger.info(f"Created backup: {backup_path}")

            return backup_path

        except Exception as e:
            self.logger.error(f"Failed to create backup: {e}")
            return None

    def log_fix_applied(self, error_report: Dict, fix_result: Dict, backup_path: str):
        """
        Log details of applied fix
        """
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'error_report': error_report,
            'fix_result': fix_result,
            'backup_path': backup_path,
            'engine_version': '1.0'
        }

        try:
            # Load existing log
            if os.path.exists(self.fix_log):
                with open(self.fix_log, 'r') as f:
                    logs = json.load(f)
            else:
                logs = []

            logs.append(log_entry)

            # Keep only last 100 entries
            if len(logs) > 100:
                logs = logs[-100:]

            with open(self.fix_log, 'w') as f:
                json.dump(logs, f, indent=2)

        except Exception as e:
            self.logger.error(f"Failed to log fix: {e}")


if __name__ == '__main__':
    # Command line interface for the fix engine
    import argparse

    parser = argparse.ArgumentParser(
        description='Automated Fix Engine for Garage Management System')
    parser.add_argument('--analyze', action='store_true',
                        help='Analyze error reports')
    parser.add_argument('--fix', action='store_true',
                        help='Apply automated fixes')
    parser.add_argument('--max-fixes', type=int, default=10,
                        help='Maximum number of fixes to apply')

    args = parser.parse_args()

    engine = AutomatedFixEngine()

    if args.analyze:
        errors = engine.analyze_error_reports()
        print(f"Found {len(errors)} fixable errors")
        for error in errors:
            print(
                f"- {error.get('report', {}).get('error', {}).get('message', 'Unknown error')}")

    if args.fix:
        results = engine.apply_fixes(max_fixes=args.max_fixes)
        print(
            f"Applied {results['fixes_applied']} fixes out of {results['total_attempts']} attempts")
