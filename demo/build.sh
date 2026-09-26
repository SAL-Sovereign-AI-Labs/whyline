#!/bin/sh
# Build (or rebuild) the Whyline demo repo next to this repository.
set -e
cd "$(dirname "$0")/.."
node demo/build.js "$@"
