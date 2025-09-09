// PM2 Ecosystem Configuration for MOT Scanner
module.exports = {
  apps: [
    {
      name: 'mot-scanner',
      script: './automated-mot-scanner.cjs',
      cwd: './scripts',
      instances: 1,
      exec_mode: 'fork',
      
      // Auto-restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      
      // Environment
      env: {
        NODE_ENV: 'production'
      },
      
      // Logging
      log_file: './logs/mot-scanner.log',
      out_file: './logs/mot-scanner-out.log',
      error_file: './logs/mot-scanner-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Advanced PM2 features
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Cron restart (optional - restart every day at 1 AM)
      cron_restart: '0 1 * * *',
      
      // Kill timeout
      kill_timeout: 5000,
    }
  ]
};
