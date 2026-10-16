#!/usr/bin/env bash
set -e
CEL="u0_a227@192.168.1.86"
cd "$(dirname "$0")"

git push
npm run build
rm -rf .next/cache

ssh -p 8022 $CEL 'rm -rf ~/Telegram-product-scraper/.next'
scp -P 8022 -r .next $CEL:~/Telegram-product-scraper/
ssh -p 8022 $CEL 'cd ~/Telegram-product-scraper && git fetch && git reset --hard @{u} && npm install && pm2 restart all'
echo "Pronto."
