#!/bin/bash
set -eux

# We have packed the shrinkwrap file, now go back to dev setup with full install.
rm npm-shrinkwrap.json
git checkout -- package-lock.json
# Skip the scripts as don't need to run tsc again (via prepare script).
npm install --ignore-scripts
