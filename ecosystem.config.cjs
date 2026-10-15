module.exports = {
  apps: [
    {
      name: 'site',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 0.0.0.0 -p 3000',
      cwd: __dirname,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'collector',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'src/scripts/collect.ts',
      cwd: __dirname,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        BOT_MANAGED_BY_DEV: '1',
      },
    },
    {
      name: 'bot',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'src/scripts/bot.ts',
      cwd: __dirname,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
