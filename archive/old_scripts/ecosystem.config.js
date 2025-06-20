module.exports = {
  apps: [
    {
      name: 'garage-management-system',
      script: 'python3',
      args: 'src/main.py',
      cwd: '/path/to/your/garage-management-system',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
        FLASK_ENV: 'production'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
}
