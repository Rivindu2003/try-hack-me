#!/bin/sh
set -e

if [ ! -f "${DB_PATH:-./data.db}" ]; then
  echo "Database not found. Seeding..."
  node init_db.js
else
  echo "Database already present. Skipping seed."
fi

exec node app.js