#!/bin/bash

set -e

cd src/data

if [ -e "initial.json" ]; then
  rm -f initial.json.bak
  cp initial.json initial.json.bak
fi

if [ -e "initial.ts" ]; then
  rm -f initial.ts.bak
  mv initial.ts initial.ts.bak
fi

cat initial.json | jq -CM . > initial.ts

sed -i '1 s/^.*$/export const NewGameData = {/' initial.ts
echo ';' >> initial.ts
