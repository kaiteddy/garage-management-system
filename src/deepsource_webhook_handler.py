#!/usr/bin/env python3
"""
DeepSource Webhook Handler - Processes DeepSource analysis results
and triggers appropriate automated fixes
"""

import hashlib
import hmac
import json
import logging
import os
from datetime import datetime
from typing import Dict, List, Optional

from flask import Flask, jsonify, request

from deepsource_fix_manager import DeepSourceFixManager, FixRecord


class DeepSourceWebhookHandler:
    """Handles DeepSource webhooks and triggers automated fixes"""

    def __init__(self, fix_manager: DeepSourceFixManager):
        self.fix_manager = fix_manager
        self.logger = logging.getLogger(__name__)

        # Load webhook configuration
        self.webhook_secret = os.environ.get('DEEPSOURCE_WEBHOOK_SECRET')
        if not self.webhook_secret:
            self.logger.warning(
                "DEEPSOURCE_WEBHOOK_SECRET not set - webhook verification disabled")

    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """Verify webhook signature from DeepSource"""
        if not self.webhook_secret:
            return True  # Skip verification if no secret set

        expected_signature = hmac.new(
            self.webhook_secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(f"sha256={expected_signature}", signature)

    def handle_analysis_complete(self, payload: Dict) -> Dict:
        """Handle analysis complete webhook"""
        try:
            analysis_data = payload.get('analysis', {})
            repository = payload.get('repository', {})

            self.logger.info(
                f"Analysis complete for {repository.get('name', 'unknown')}")

            # Extract issues from analysis
            issues = analysis_data.get('issues', [])

            # Process each issue
            processed_issues = []
            for issue in issues:
                result = self._process_issue(issue, repository)
                processed_issues.append(result)

            # Generate summary
            summary = self._generate_analysis_summary(
                processed_issues, analysis_data)

            return {
                'status': 'success',
                'processed_issues': len(processed_issues),
                'auto_fixable': len([i for i in processed_issues if i.get('auto_fixable', False)]),
                'summary': summary
            }

        except Exception as e:
            self.logger.error(f"Error handling analysis complete: {e}")
            return {'status': 'error', 'message': str(e)}

    def _process_issue(self, issue: Dict, repository: Dict) -> Dict:
        """Process a single issue from DeepSource analysis"""
        issue_type = issue.get('issue_code', 'unknown')
        file_path = issue.get('location', {}).get('path', '')
        line_number = issue.get('location', {}).get(
            'position', {}).get('begin', {}).get('line')
        description = issue.get('title', 'Unknown issue')

        # Generate fix ID
        fix_id = self.fix_manager.generate_fix_id(
            file_path, line_number, issue_type)

        # Check if already fixed
        if self.fix_manager.is_fix_already_applied(fix_id):
            return {
                'fix_id': fix_id,
                'status': 'already_fixed',
                'issue_type': issue_type,
                'file_path': file_path,
                'auto_fixable': False
            }

        # Determine if auto-fixable
        auto_fixable = self.fix_manager.should_auto_fix(issue_type, file_path)

        # Create fix record
        fix_record = FixRecord(
            fix_id=fix_id,
            issue_type=issue_type,
            file_path=file_path,
            line_number=line_number,
            fix_description=description,
            fix_method='pending',
            applied_at=datetime.now().isoformat(),
            pr_number=None,
            commit_sha=None,
            success=False
        )

        # Record the issue (not yet fixed)
        self.fix_manager.record_fix(fix_record)

        return {
            'fix_id': fix_id,
            'status': 'pending',
            'issue_type': issue_type,
            'file_path': file_path,
            'line_number': line_number,
            'description': description,
            'auto_fixable': auto_fixable,
            'severity': issue.get('severity', 'unknown')
        }

    def _generate_analysis_summary(self, processed_issues: List[Dict],
                                   analysis_data: Dict) -> Dict:
        """Generate summary of analysis results"""
        total_issues = len(processed_issues)
        auto_fixable = len(
            [i for i in processed_issues if i.get('auto_fixable', False)])
        already_fixed = len(
            [i for i in processed_issues if i.get('status') == 'already_fixed'])

        # Group by issue type
        by_type = {}
        for issue in processed_issues:
            issue_type = issue.get('issue_type', 'unknown')
            if issue_type not in by_type:
                by_type[issue_type] = {'count': 0, 'auto_fixable': 0}
            by_type[issue_type]['count'] += 1
            if issue.get('auto_fixable', False):
                by_type[issue_type]['auto_fixable'] += 1

        # Group by severity
        by_severity = {}
        for issue in processed_issues:
            severity = issue.get('severity', 'unknown')
            if severity not in by_severity:
                by_severity[severity] = 0
            by_severity[severity] += 1

        return {
            'total_issues': total_issues,
            'auto_fixable': auto_fixable,
            'already_fixed': already_fixed,
            'new_issues': total_issues - already_fixed,
            'by_type': by_type,
            'by_severity': by_severity,
            'analysis_timestamp': analysis_data.get('created_at', datetime.now().isoformat())
        }

    def handle_autofix_created(self, payload: Dict) -> Dict:
        """Handle autofix PR created webhook"""
        try:
            pr_data = payload.get('pull_request', {})
            pr_number = pr_data.get('number')
            pr_title = pr_data.get('title', '')
            commit_sha = pr_data.get('head', {}).get('sha')

            self.logger.info(f"Autofix PR created: #{pr_number} - {pr_title}")

            # Extract fix information from PR
            fixes_applied = self._extract_fixes_from_pr(pr_data)

            # Update fix records
            for fix_info in fixes_applied:
                fix_record = FixRecord(
                    fix_id=fix_info['fix_id'],
                    issue_type=fix_info['issue_type'],
                    file_path=fix_info['file_path'],
                    line_number=fix_info.get('line_number'),
                    fix_description=fix_info['description'],
                    fix_method='auto',
                    applied_at=datetime.now().isoformat(),
                    pr_number=pr_number,
                    commit_sha=commit_sha,
                    success=True
                )

                self.fix_manager.record_fix(fix_record)

            return {
                'status': 'success',
                'pr_number': pr_number,
                'fixes_applied': len(fixes_applied)
            }

        except Exception as e:
            self.logger.error(f"Error handling autofix created: {e}")
            return {'status': 'error', 'message': str(e)}

    def _extract_fixes_from_pr(self, pr_data: Dict) -> List[Dict]:
        """Extract fix information from PR data"""
        # This is a simplified implementation
        # In practice, you'd parse the PR description and changed files
        # to determine what fixes were applied

        fixes = []
        pr_body = pr_data.get('body', '')

        # Parse PR body for fix information
        # This would need to be customized based on DeepSource's PR format
        if 'format code with' in pr_body.lower():
            # Style/formatting fixes
            fixes.append({
                'fix_id': f"style_fix_{pr_data.get('number', 'unknown')}",
                'issue_type': 'style',
                'file_path': 'multiple',
                'description': 'Code formatting and style fixes'
            })

        return fixes

    def get_webhook_stats(self) -> Dict:
        """Get webhook processing statistics"""
        # This would track webhook processing metrics
        return {
            'total_webhooks_processed': 0,  # Would be tracked in database
            'successful_processes': 0,
            'failed_processes': 0,
            'last_webhook_time': None
        }


# Flask app for webhook endpoint
app = Flask(__name__)
fix_manager = DeepSourceFixManager()
webhook_handler = DeepSourceWebhookHandler(fix_manager)


@app.route('/webhook/deepsource', methods=['POST'])
def handle_deepsource_webhook():
    """Handle incoming DeepSource webhooks"""
    try:
        # Verify signature
        signature = request.headers.get('X-DeepSource-Signature', '')
        if not webhook_handler.verify_webhook_signature(request.data, signature):
            return jsonify({'error': 'Invalid signature'}), 401

        payload = request.get_json()
        event_type = request.headers.get('X-DeepSource-Event', 'unknown')

        # Route to appropriate handler
        if event_type == 'analysis.completed':
            result = webhook_handler.handle_analysis_complete(payload)
        elif event_type == 'autofix.created':
            result = webhook_handler.handle_autofix_created(payload)
        else:
            result = {'status': 'ignored', 'event_type': event_type}

        return jsonify(result)

    except Exception as e:
        logging.error(f"Webhook processing error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/webhook/stats', methods=['GET'])
def get_webhook_stats():
    """Get webhook processing statistics"""
    stats = webhook_handler.get_webhook_stats()
    fix_stats = fix_manager.get_fix_statistics()

    return jsonify({
        'webhook_stats': stats,
        'fix_stats': fix_stats
    })


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'deepsource-webhook-handler'
    })


if __name__ == '__main__':
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )

    # Run webhook server
    port = int(os.environ.get('WEBHOOK_PORT', 5002))
    app.run(host='0.0.0.0', port=port, debug=False)
