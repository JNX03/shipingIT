# ShipingIT — ready-to-paste Devpost submission

This document contains submission copy only. It does not submit the form. The demo video is a separate deliverable; add its final verified link in Devpost when available.

## Project name

ShipingIT

## Elevator pitch

A playful school for shipping apps: meet characters, uncover a need, build working prototypes, and turn small experiments into a confident first launch.

## About the project

### Inspiration

The exciting part of an app idea is easy to imagine. The next step is harder: Who needs it? What belongs in the first version? How do you know it works?

ShipingIT makes those questions approachable for students building their first project. A school becomes the setting, everyday problems become the missions, and small decisions move the learner from an idea toward something they can test.

### What it does

You interview fictional characters, collect clues, separate evidence from assumptions, choose a manageable scope, arrange a screen, connect its behavior and test the result.

Eight units combine 32 core lessons, 97 authored exercises, 24 builder challenges and six main games. Ami guides the journey, with story chapters and English/Thai word help. Independent practice lets you revisit a skill.

Build and try Lunch Lens, a lunch queue board; CampusCompass, a campus route prototype; or StudyBuddy, an authored study-practice prototype. Each has its own saved draft and Build, Try and Notes views. Sparks reward learning once and unlock outfits and heart packs.

### How we built it

Expo SDK 57, React Native and TypeScript power the app, with Expo Router and Zustand/local persistence. Game rules are separate from screens so prerequisites, rewards and save recovery can be tested directly. Original artwork, reduced motion and tap alternatives support the mobile experience.

Supabase handles sign-in. A Node/Supabase Edge backend validates optional OpenRouter requests; PostgreSQL enforces the hosted daily quota. Model credentials stay server-side. Live replies and authored advice have distinct labels, and AI never decides grades or rewards.

RevenueCat supplies offerings, localized prices and verified Pro access. Core learning stays free after sign-in; Pro adds helpers, eight bonus labs, unlimited shop Sparks and full Project Pack export/copying. The preview uses Test Store sandbox products.

### Challenges we ran into

Progress had to be trustworthy: reward once, recover failed saves and invalidate dependent work when an earlier decision changes. Independent drafts also keep a map experiment from overwriting a study app.

Native services taught us that compiling an SDK proves less than exercising a real flow. We separated browser replies, native sandbox transactions and APK checks, and made pending, unavailable and test-only states visible to the learner.

### What we learned

Teaching people to ship made us practice the same lesson: choose a small promise, make it testable and keep feedback honest. Colorful screens invite someone in; reliable saving and a clear next step help them continue. Accessibility and disclosed service limits belong in that experience from the start.

### What's next

We want to test the journey with students, improve lessons from their feedback, finish broader native acceptance and validate full export. Production billing, a tested iOS build and carefully designed cloud backup are future milestones.

### Current preview scope

The Android download is a debuggable development preview using a compatible existing native payload. Prototypes use authored/simulated data inside ShipingIT; CampusCompass has no live GPS and StudyBuddy's live AI is off. Progress stays local. Ami/Noa web replies and native sandbox purchase/restore have been exercised. One native Ami reply was observed after consent, with no project notes attached; broader native AI acceptance remains pending. Typed-answer model feedback and full owned export remain unverified. No production purchase or tested iOS binary is claimed.

## Built with

TypeScript, React, React Native, Expo, Expo Router, Zustand, AsyncStorage, React Native Reanimated, React Native Gesture Handler, Supabase, PostgreSQL, Supabase Edge Functions, Deno, Node.js, RevenueCat, OpenRouter, Expo Speech, Expo Haptics, ESLint, GitHub Actions

20 genuine technologies; select the matching Devpost tags that exist in its picker.

## Try it out links

- Android APK and companion files: https://github.com/JNX03/shipingIT/releases/tag/v1.0.0-nextgen-preview.1
- Source code, screenshots and setup: https://github.com/JNX03/shipingIT
- Setup guide: https://github.com/JNX03/shipingIT#run-locally

## App type(s)

Mobile app — Android. The source supports local web previews and includes iOS configuration, but this submission does not include a tested iOS binary or a publicly deployed web app.

## RevenueCat project ID

`proj1604642b`

Retrieved from RevenueCat **Project Settings → General → Project ID**. This is the project ID, not an app ID, offering ID, entitlement or API key.
