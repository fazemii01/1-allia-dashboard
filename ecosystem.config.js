module.exports = {
  apps: [
    {
      name: 'alliakids-dashboard',
      script: 'npm',
      args: 'run preview',
      shell: true,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
