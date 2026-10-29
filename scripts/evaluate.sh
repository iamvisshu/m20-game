#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "========================================"
echo " M20 Automated Accuracy Evaluation"
echo "========================================"
echo

npm run dataset:validate

echo
echo "Running deterministic engine evaluation..."
echo

npm test -- --reporter=verbose

echo
echo "========================================"
echo " Evaluation completed successfully"
echo "========================================"
