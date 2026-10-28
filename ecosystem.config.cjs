module.exports = {
  apps: [
    {
      name: "monitoreo-relojes-adultos",
      script: "server.js",
      cwd: "/root/monitoreo-relojes-adultos",
      interpreter: "node",
      watch: false,
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
        PORT: "3108",
        HOST: "127.0.0.1"
      },
      error_file: "/root/monitoreo-relojes-adultos/logs/error.log",
      out_file: "/root/monitoreo-relojes-adultos/logs/output.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss"
    }
  ]
};
