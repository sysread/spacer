#!/bin/bash

set -e

cd src/data

rm -f initial.json initial.ts

cat initial.json | jq -CM . > initial.ts

sed -i '1 s/^.*$/export const NewGameData = {/' initial.ts

echo ';' >> initial.ts
