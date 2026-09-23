#!/usr/bin/env bash
#
# Prints the distribution list: one address per line, comments and blank
# lines stripped.
#
# The release workflow and `testers.test.ts` both read the list through here
# rather than each parsing the file their own way. A test that parses
# differently from the thing it is testing proves nothing, and the failure it
# would miss — an address silently dropped — is invisible until somebody says
# they never got the app.
set -euo pipefail

LIST="${1:-$(dirname "$0")/../testers.txt}"

if [ ! -f "$LIST" ]; then
  echo "No such list: $LIST" >&2
  exit 1
fi

# `grep -v` finding nothing is exit 1, which `set -e` would treat as failure;
# an empty list is a real state, and the caller decides whether it is an error.
sed -e 's/#.*//' -e 's/[[:space:]]//g' "$LIST" | grep -v '^$' || true
