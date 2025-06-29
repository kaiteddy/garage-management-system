#!/usr/bin/env python3
"""Enterprise database cleanup utility.

Removes stale records and optimizes the SQLite database used by the
Garage Management System. The database path can be provided via the
``--db`` argument or the ``GMS_DB_PATH`` environment variable.
"""

import argparse
import os
import sqlite3
from datetime import datetime, timedelta


def get_db_path(cli_path: str | None) -> str:
    return cli_path or os.environ.get('GMS_DB_PATH') or os.path.join('instance', 'garage.db')


def cleanup_database(db_path: str) -> None:
    print(f"🗑️  Cleaning database at {db_path}...")
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute('PRAGMA foreign_keys = ON')

        # Remove audit log entries older than 90 days
        cutoff_audit = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')
        cursor.execute('DELETE FROM audit_log WHERE timestamp < ?', (cutoff_audit,))

        # Remove completed appointments older than one year
        cutoff_appointments = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
        cursor.execute(
            "DELETE FROM appointments WHERE status='completed' AND appointment_date < ?",
            (cutoff_appointments,)
        )

        conn.commit()
        cursor.execute('VACUUM')

    print("✅ Database cleanup completed")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Run database maintenance tasks')
    parser.add_argument('--db', help='Path to database file')
    args = parser.parse_args()

    cleanup_database(get_db_path(args.db))
