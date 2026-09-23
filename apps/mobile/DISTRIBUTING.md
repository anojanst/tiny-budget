# Shipping the APK

This repository is public, which is what makes the whole route free: GitHub
Actions has unlimited minutes on public repositories, and Releases host files
up to 2 GB at no cost. The build uses `expo prebuild` and Gradle directly
rather than EAS, so no build service quota is involved either.

Total cost: nothing.

## One-time setup

### 1. Make a keystore

Every Android app is signed, and the signature is the app's identity. Keep
this file safe **forever** — see the warning at the bottom.

```bash
npm run keystore --workspace @tiny-budget/mobile
```

It asks for a password and some identity fields; the fields can be anything,
and the password is typed into keytool directly rather than passed through a
script.

**If you get `keytool: command not found`,** you almost certainly do not need
to install a JDK. `keytool` lives inside one, and on a machine set up for
Android development the JDK is usually the one bundled with Android Studio
rather than one installed separately — it is just not on `PATH`. The script
above looks in the usual places, including Android Studio's, so run it instead
of calling `keytool` directly. To call it by hand:

```bash
# Android Studio installed as a snap
/snap/android-studio/current/jbr/bin/keytool -genkeypair -v \
  -keystore tiny-budget.keystore -alias tiny-budget \
  -keyalg RSA -keysize 2048 -validity 10000
```

Only if no JDK exists at all: `sudo apt install openjdk-17-jre-headless`.

The script refuses to overwrite an existing keystore, because replacing one is
unrecoverable — a new key is a new app identity, and every install has to be
removed before the next build will go on.

### 2. Put it in GitHub Secrets

Settings → Secrets and variables → Actions → New repository secret. Four of
them:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 tiny-budget.keystore` |
| `ANDROID_STORE_PASSWORD` | the keystore password |
| `ANDROID_KEY_ALIAS` | `tiny-budget` |
| `ANDROID_KEY_PASSWORD` | the key password (same as the store password unless you set another) |

Never commit the keystore itself. The workflow decodes it into a temp file and
deletes it in the same step.

## Releasing

Bump both numbers in `apps/mobile/app.json` first — `version` is what people
read, `android.versionCode` is what Android compares:

```json
"version": "1.1.0",
"android": { "versionCode": 2 }
```

Then tag:

```bash
git tag mobile-v1.1.0 && git push --tags
```

The workflow tests, typechecks, builds, signs, and attaches `tiny-budget.apk`
to a new GitHub Release. Anyone can download it from the Releases page.

`workflow_dispatch` runs the same build without publishing, leaving the APK as
a workflow artifact — useful for checking a build before committing to a tag.

## What the install screen says

Four permissions, not one:

| Permission | Where it comes from |
| --- | --- |
| `INTERNET` | React Native itself. Nothing in this app sends anything anywhere. |
| `SYSTEM_ALERT_WINDOW` | React Native's dev menu and LogBox overlay. Unused in a release build. |
| `VIBRATE` | React Native's `Vibration` API. Unused here. |
| `…DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` | A private, app-scoped permission AndroidX defines for its own broadcast receivers. Grants nothing outside the app. |

Read and write access to external storage *is* blocked, in `app.json` —
Expo's defaults pull it in, and `expo-file-system` declares it too, but an app
whose whole pitch is that nothing leaves the phone should not be asking for
the filesystem on the install screen.

Only the first three are visible to a user, and none is prompted for at
runtime. `expo config` does not show the last three; they are merged in from
the libraries' own manifests at build time, so the only way to know what an
APK really asks for is `aapt2 dump badging` on the built file.

## What to tell people installing it

Android warns that the file came from outside the Play Store. That warning is
about the *source*, not the file: they allow installs for whichever app they
downloaded it with (usually Chrome or Files), then open the APK again.

Sideloaded apps do not auto-update. A new version means downloading the new
APK — which is why `versionCode` has to go up, or Android refuses to install
over the existing copy.

## If you outgrow this

| Route | Cost | Worth it when |
| --- | --- | --- |
| GitHub Releases *(this)* | free | sharing a link with people you know |
| Firebase App Distribution *(this)* | free | you want a named list and install tracking |
| Google Play | $25 once | you want strangers to find it, and auto-updates |
| F-Droid | free | you add an open-source licence; this repo has none yet |

The one thing neither of the free routes buys is a clean install. Only the
Play Store removes the "unknown sources" warning and updates the app by
itself; everywhere else, every new version is a download someone has to accept
past a warning. If the list grows past people you can explain that to, the $25
is the fix.

## The distribution list

`apps/mobile/testers.txt` is who gets the app. One address per line; `#`
comments and blank lines are for whoever edits it and are stripped before the
list is used.

Every address there is emailed an install link when a `mobile-v*` tag builds,
and emailed again on every release after that — which is the part a Release
link cannot do, since a link has no idea who took it or when a new one exists.

Adding someone is a commit. Removing someone stops future emails but does not
uninstall what they already have; to cut off access, remove them in the
Firebase console too.

### One-time Firebase setup

Only you can do this part — it creates an account and a credential.

1. At <https://console.firebase.google.com> create a project (no Analytics
   needed), then **Add app → Android** with the package name
   `com.tinybudget.app`. Skip the `google-services.json` download: this app
   does not use any Firebase SDK, only the upload service.
2. Open **Release & Monitor → App Distribution** once and accept the terms.
   Distribution fails until that has been done by hand.
3. Copy the **App ID** from Project settings. It looks like
   `1:123456789012:android:abc123def456`.
4. Make a service account for the upload, in the Google Cloud console for the
   same project: **IAM & Admin → Service Accounts → Create**, then grant it
   the **Firebase App Distribution Admin** role, and under **Keys** add a new
   **JSON** key. A file downloads.

Then set both secrets. Pipe the key from the file — do not open it and paste
it. It is ~2.3kB of JSON and a clipboard mangles it, which is exactly how the
keystore secret broke:

```bash
gh secret set FIREBASE_APP_ID --body '1:123456789012:android:abc123def456'
gh secret set FIREBASE_SERVICE_ACCOUNT < ~/Downloads/your-project-abc123.json
```

Then delete the downloaded key: it is a credential that can publish releases
to everyone on the list, and it does not expire.

```bash
shred -u ~/Downloads/your-project-abc123.json
```

The workflow skips distribution entirely when `FIREBASE_APP_ID` is unset, so
releases keep working whether or not this is set up.

### Check it before you need it

Firebase's setup has four ways to be subtly wrong — a truncated key, a
service account without the right role, App Distribution never opened in the
console, an app id from the wrong project — and every one of them surfaces at
*upload* time, fifteen minutes into a release, after the APK is built and
signed. So check first:

**Actions → Android APK → Run workflow**, tick *Check the Firebase setup and
tester list*, run it.

It builds nothing and emails nobody. It reads the tester list, confirms the
key is complete, confirms the service account can reach App Distribution, and
confirms the app id belongs to that project — then names whichever of those is
wrong. About thirty seconds.

### Rolling it out

Distribution is all-or-nothing per release: everyone on the list gets the same
build. So put only yourself in `testers.txt` for the first Firebase release,
confirm the email arrives and the install works from your own phone, and add
everyone else in a follow-up commit. They are emailed on the *next* release
after being added, not retroactively.

### What a tester sees

The first release they are added to sends an email inviting them to the app.
They accept on the phone, and install from a web page — no extra app to
install first, though Firebase will offer one. Every later release emails them
again with the release notes, which are the tag and the commit subject.

## The one thing that cannot be undone

If you lose the keystore, you cannot ship an update that installs over the
existing app — Android treats a differently-signed APK as a different app, and
every user has to uninstall first, which deletes their budget. There is no
backup: everything this app stores lives on the phone.

Back the keystore up somewhere you will still have in five years, and keep the
passwords with it.
