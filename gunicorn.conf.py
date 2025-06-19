# Gunicorn configuration file
import multiprocessing

# Server socket
bind = "127.0.0.1:5001"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# Restart workers after this many requests, to help prevent memory leaks
max_requests = 1000
max_requests_jitter = 50

# Logging
accesslog = "./logs/gunicorn_access.log"
errorlog = "./logs/gunicorn_error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Process naming
proc_name = 'garage_management'

# Daemon mode
daemon = False

# PID file
pidfile = './logs/gunicorn.pid'

# User and group
user = 'www-data'
group = 'www-data'

# Preload application
preload_app = True

# Enable auto-reload in development
reload = False
