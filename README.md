# Sutra Speed: Vedic Maths

An offline Android app that teaches Vedic maths shortcuts and drills them against the clock,
aimed at the numerical aptitude section of SSC and banking exams.

The app has no network permission at all. Nothing about a user leaves their phone.

## What is in it

**Learn** — 19 sutra lessons, each with its meaning, what it is good for, a numbered method,
an animated worked example that highlights the digits as they combine, a "watch out" warning
and the exam topics it serves. Tabs switch between sutras; a filter separates the 12 core
(Tier A) sutras from the 7 advanced (Tier B) ones.

**Step by step** — the worked example broken into one small question at a time, so a learner
applies each step of the trick themselves before being asked for a whole answer.

**Sutra drills** — five timed questions on a number keypad, with a target of 30 seconds
(45 for Tier B). Questions are generated fresh every time, so practice never runs out.

**Topic practice** — 261 checked exam questions across 15 topics, each with four options and
a worked solution. Questions you have already seen are held back until the pool runs dry.

**Exams** — a free 10-question test in 5 minutes, and 25, 30 and 50-question papers behind
Pro. One timer for the whole paper, a question palette, exam marking (+2 / −0.5, or +3 / −1
for the Tier 2 format), auto-submit when time runs out, then a score with a topic breakdown
and a full answer review.

**Progress** — a streak with a week strip, a badge per sutra (Learning, Practised, Mastered),
per-sutra drill statistics and per-topic accuracy.

## Getting the APK

1. Push this folder to a GitHub repository on branch `main`.
2. Open the **Actions** tab. Every push runs the tests and then builds; you can also start it
   by hand with **Run workflow**.
3. Download the **sutra-speed-debug** artifact, unzip it, copy `app-debug.apk` to a phone,
   allow installs from unknown sources for your file manager, and tap the file.

To build locally instead, open the folder in Android Studio and press Run, or with the
Android SDK installed and `ANDROID_HOME` set:

```
gradle assembleDebug
```

## Releasing to Google Play

The workflow builds a signed `.aab` when you publish a GitHub release, provided four
repository secrets exist. Create an upload keystore once:

```
keytool -genkey -v -keystore release.jks -keyalg RSA -keysize 2048 \
        -validity 10000 -alias upload
base64 -w0 release.jks          # paste the output into KEYSTORE_BASE64
```

Then add, under Settings → Secrets and variables → Actions:

| Secret | What it is |
|---|---|
| `KEYSTORE_BASE64` | the keystore file, base64-encoded |
| `KEYSTORE_PASSWORD` | the keystore password |
| `KEY_ALIAS` | the alias, e.g. `upload` |
| `KEY_PASSWORD` | the key password |

Keep `release.jks` safe and out of the repository. Losing it means you can never update the
app under the same listing.

## Before you publish

Three things are deliberately unfinished, because none of them can be completed from a
source repository alone:

1. **Payments.** The Pro paywall shows the price and unlocks a flag; it is not wired to
   Google Play Billing, which needs a published app and a product id. Until it is, treat Pro
   as a preview of the flow, not a way to take money.
2. **Sign-in.** The app keeps progress on the device with no account. Google sign-in needs a
   Firebase or OAuth client id tied to your signing key, and adding it means adding the
   INTERNET permission and a privacy policy that says what is sent.
3. **Play listing requirements.** A published app needs a privacy policy URL, a data safety
   form, a content rating and store graphics. Because the app collects nothing and has no
   network access, the data safety form is short and honest.

## How it is built

The interface is a self-contained web layer in `app/src/main/assets/`, hosted by a small
Kotlin activity that owns the saved progress file. That keeps the APK tiny and quick to
change. If the app grows, the natural next step is porting screen by screen to native
Compose, reusing the same JSON data files.

```
app/src/main/assets/
  index.html, app.css, app.js   the whole interface
  drills.js                     one question generator per sutra
  lessons.json                  19 lessons: method, animation, guided steps, fallback drills
  questions.json                261 checked exam questions
app/src/main/java/in/sutraspeed/app/MainActivity.kt
tools/test_drills.js            4,000 brute-force samples per generator
tools/test_app.js               drives every screen in a headless browser
.github/workflows/android.yml   tests, then builds the APK
```

## Tests

Both run in CI on every push, and the APK is not built if either fails.

```
node tools/test_drills.js   # every generated question solved independently
npm install jsdom --no-save && node tools/test_app.js
```

`test_app.js` plays a full drill set, a guided run, topic practice, a timed exam including
the time-out path, the paywall and the back button, and it recomputes the exam score by hand
to check the marking.

## Question provenance

Every question is original, written for this app. None is copied from a question paper or a
textbook. The `pattern_tag` on each question is our own classification of its type and level,
not a claim that it appeared in any paper, and `pyq_ref` is empty until a question is tagged
from a real paper in hand.
