#!/bin/bash
set -eux
# Make a production shrinkwrap file before packing.

# Clean install of production modules using package-lock.json
rm -rf node_modules
rm -f npm-shrinkwrap.json
npm install --production
# Build shrinkwrap from production modules
rm -f package-lock.json
npm shrinkwrap
