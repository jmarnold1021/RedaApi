#!/bin/bash

# All File mutations refer to container paths... 


rm -rf ./public

echo "Building Docs `pwd`"
mkdir ./public 

# Retrieve Doc comps and templates
cp docs/overview.md ./public/overview.md
cp docs/conventions.md ./public/conventions.md
cp docs/defs.js ./public/defs.js
cp docs/${REDA_SCHEMA}/docs.js ./public/schema_docs.js
cp docs/results/docs.js ./public/result_docs.js

FULL_HOSTNAME=${APP_NAME}.${HOST}

sed -i '' -e "s/<%HOSTNAME%>/${FULL_HOSTNAME}/g" ./public/* &> /dev/null

if [ "z${APP_NAME}" != "z" ] && [ "z${AUTH}" != "z" ] && [ "${AUTH}" != "false" ] && [ "${AUTH}" != "0" ];
then
  sed -i '' -e "s/<%USER_ROLE%>/user/g" ./public/* &> /dev/null
  sed -i '' -e "s/<%ADMIN_ROLE%>/admin/g" ./public/* &> /dev/null
else
  echo "[scripts][build_docs][warn] AUTH ENV var not set"
  sed -i '' -e "s/<%USER_ROLE%>/none/g" ./public/* &> /dev/null
  sed -i '' -e "s/<%ADMIN_ROLE%>/none/g" ./public/* &> /dev/null
fi

./node_modules/.bin/apidoc -f "^/*" -i ./public/ -o public/apidoc

