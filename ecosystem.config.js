module.exports = {
  apps: [
    {
      name: 'garage-manager-app',
      script: 'npm',
      args: 'run dev',
      cwd: '/Users/adamrutstein/v0dashboard-2',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      log_file: './logs/garage-manager-app.log',
      error_file: './logs/garage-manager-app-error.log',
      out_file: './logs/garage-manager-app-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'garage-manager-tunnel',
      script: 'ngrok',
      args: 'http 3000 --domain=garage-manager.eu.ngrok.io',
      env: {
        NGROK_AUTHTOKEN: '2zrEXdLJO1jMrxOFOSiKWP0Qwln_3zT3rWjW4kwadPKHTFAGA'
      },
      watch: false,
      restart_delay: 5000,
      max_restarts: 50,
      min_uptime: '10s',
      log_file: './logs/garage-manager-tunnel.log',
      error_file: './logs/garage-manager-tunnel-error.log',
      out_file: './logs/garage-manager-tunnel-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
}
