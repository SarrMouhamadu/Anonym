module.exports = {
  apps: [{
    name: 'anonyme',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    env: { NODE_ENV: 'production' }
  }]
};
