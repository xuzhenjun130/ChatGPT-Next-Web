module.exports = {
    apps : [{
      name: "chatgpt",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      }
    }],
    deploy : {
      production : {
        user : "node",
        host : "my-website.com",
        ref  : "origin/master",
        repo : "git@github.com:repo.git",
        path : "/var/www/my-website",
        "post-deploy" : "npm install && npm run build && pm2 reload ecosystem.config.js --env production",
        env  : {
          NODE_ENV: "production"
        }
      }
    }
  };
  