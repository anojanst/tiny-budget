#!/usr/bin/env bash
# Creates the signing keystore, using whatever JDK is already on the machine.
#
# `keytool` ships inside every JDK but is rarely on PATH, and on a machine set
# up for Android development the JDK is usually the one bundled with Android
# Studio rather than one installed separately. Rather than asking anyone to
# install a second JDK, this finds the one that is already there.
#
# It never handles the password: keytool prompts for that directly, so it is
# typed into keytool and not into a shell history, a script argument, or a
# process list.
set -euo pipefail

# Both keep the old name. The keystore is the app's signing identity, not its
# branding: the file already exists under this name, and the alias inside it
# cannot be renamed at all. Changing either here would only make the docs
# describe a file nobody has.
KEYSTORE="${1:-tiny-budget.keystore}"
ALIAS="${2:-tiny-budget}"

find_keytool() {
  if command -v keytool >/dev/null 2>&1; then command -v keytool; return; fi
  if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/keytool" ]; then echo "$JAVA_HOME/bin/keytool"; return; fi
  for base in \
    /snap/android-studio/current/jbr \
    /opt/android-studio/jbr \
    "$HOME/android-studio/jbr" \
    /usr/local/android-studio/jbr \
    "$HOME/Library/Application Support/Google/AndroidStudio"*/jbr \
    /Applications/Android\ Studio.app/Contents/jbr/Contents/Home
  do
    [ -x "$base/bin/keytool" ] && { echo "$base/bin/keytool"; return; }
  done
  return 1
}

if ! KEYTOOL=$(find_keytool); then
  cat >&2 <<'MSG'
No JDK found.

keytool lives inside a JDK. Install one with:
  sudo apt install openjdk-17-jre-headless

or point JAVA_HOME at a JDK you already have.
MSG
  exit 1
fi

echo "Using $KEYTOOL"

if [ -e "$KEYSTORE" ]; then
  # Overwriting is unrecoverable: a new key means a new app identity, and
  # every existing install has to be removed before the next build will fit.
  echo "Refusing to overwrite the existing $KEYSTORE." >&2
  echo "That file is the app's identity — replacing it means every user must uninstall first." >&2
  exit 1
fi

"$KEYTOOL" -genkeypair -v \
  -keystore "$KEYSTORE" \
  -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10000

cat <<MSG

Done — $KEYSTORE

It is gitignored, and it must stay out of the repository. Next:

  1. Copy this, and set it as the ANDROID_KEYSTORE_BASE64 repo secret:
       base64 -w0 $KEYSTORE

  2. Set ANDROID_STORE_PASSWORD and ANDROID_KEY_PASSWORD to the passwords you
     just chose, and ANDROID_KEY_ALIAS to: $ALIAS

  3. Back the file up somewhere you will still have in five years. Losing it
     means no user can ever update in place — they would have to uninstall,
     which deletes their budget.
MSG
