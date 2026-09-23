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
keytool -genkeypair -v -keystore tiny-budget.keystore \
  -alias tiny-budget -keyalg RSA -keysize 2048 -validity 10000
```

It asks for a password and some identity fields; the fields can be anything.

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

The APK requests one permission, `INTERNET`, which React Native needs and
which nothing in this app uses to send anything anywhere. Expo's defaults also
pulled in read and write access to external storage; those are blocked in
`app.json`, because an app whose whole pitch is that nothing leaves the phone
should not be asking for the filesystem on the install screen.

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
| Firebase App Distribution | free | you want tester groups and install tracking |
| Google Play | $25 once | you want strangers to find it, and auto-updates |
| F-Droid | free | you add an open-source licence; this repo has none yet |

## The one thing that cannot be undone

If you lose the keystore, you cannot ship an update that installs over the
existing app — Android treats a differently-signed APK as a different app, and
every user has to uninstall first, which deletes their budget. There is no
backup: everything this app stores lives on the phone.

Back the keystore up somewhere you will still have in five years, and keep the
passwords with it.
