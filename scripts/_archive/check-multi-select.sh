#!/bin/bash
for file in scenes/v2/composite/**/*.json; do
  if grep -q '"type": "multi_select"' "$file"; then
    if ! grep -q '"options"' "$file"; then
      echo "❌ $file"
    fi
  fi
done
