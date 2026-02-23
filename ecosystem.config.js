// ecosystem.config.js — PM2 configuration for HGF Connect
// Commit this file — it contains NO secrets
module.exports = {
  apps: [
    {
      name: 'hgf-connect',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/hgf-connect',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1,
      exec_mode: 'fork',
      max_restarts: 10,
      restart_delay: 3000,
      watch: false,
      // Log files
      out_file: '/var/log/pm2/hgf-connect-out.log',
      error_file: '/var/log/pm2/hgf-connect-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
