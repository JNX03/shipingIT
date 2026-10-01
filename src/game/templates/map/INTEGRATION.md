# CampusCompass integration

This folder is a standalone map app template. Its fictional Willow Demo Campus data and original SVG diagram do not request GPS, call a provider, or use customer content.

## Root component contract

```tsx
import {
  CampusCompassTemplate,
  createDefaultCampusConfig,
  type CampusCompassConfig,
} from '@/game/templates/map';

// Keep this config in the separate project library. Existing Lunch Lens GameDraft is untouched.
<CampusCompassTemplate
  key={project.id}
  initialConfig={project.config as CampusCompassConfig}
  onConfigChange={(config) => updateProject(project.id, config)}
  onExit={() => router.back()}
/>;
```

`initialConfig` is read on mount and normalized. Mount only after loading the saved project. Remount with the project ID when opening a different saved project. `onConfigChange` receives a fresh serializable config for substantive builder changes and playable origin, destination, route, or landmark choices. Builder steps, app mode and direction disclosure are temporary UI state. Root owns persistence, save errors and Expo Router navigation.

`createDefaultCampusConfig()` starts with From + to and Campus map pieces. The learner adds Route choices and Directions, arranges the screen, chooses colors/labels/direction detail, and connects three actions. `campusCompassExampleDraft()` provides a complete authored example for preview/QA, without mutating real learner progress.

Public helpers include `normalizeCampusCompassDraft(unknown)`, `checkCampusCompassBuild(config)`, `runCampusCompassTest(config)`, `planCampusTrip(config, trip?)`, and draft registry metadata `campusCompassTemplate` with ID `map`. The controlled builder, prototype and template screen are also exported. Root can adapt the metadata to its common project registry without changing this folder.

## Concrete behavior

- The shortest South Gate → Science Lab path is Gate → Fountain → East Steps → Lab: 220 m, 4 practice minutes, two flights of stairs.
- “No stairs” changes the graph route to Gate → Fountain → Ramp → Lab: 345 m, 5 practice minutes, zero stairs. The highlighted geometry and generated directions both change.
- Landmark selection changes the route through that point. Via Library is a genuine 525 m ramp route with a retraced library spur; via Garden is 355 m.
- Disconnecting route planning stops the route. Disconnecting drawing retains route choices but removes the highlighted map path. Disconnecting directions removes the usable instructions.
- Order changes render order. Color, label density and direction detail change the actual playable output. Same-place trips report already there with zero distance.
- The test “Can I find the lab without stairs?” reports expected and actual outcomes for endpoints, stairs, drawn route and matching directions. Its result expires after config changes. It is labeled a simulated test and never completes a real lesson or changes account state.

## Focused verification

Verified on 2026-09-30 against Expo `~57.0.25`, React Native `0.86.3`, `@expo/ui` `57.0.20`, and existing `react-native-svg` `15.15.4`. Read SDK 57 docs and the installed universal Picker/Host types before implementation.

- 13/13 tests pass in `logic.test.ts`.
- All 81 origin/destination combinations are checked for contiguous geometry, summed distances and stairs-free terrain. Shortcut and accessibility outputs differ; reverse directions and actual landmark detours are covered.
- Starter and every removed essential piece/action fail the same test planner used by the app. Config round-trip, invalid data, immutable ordering and test signature changes are covered.
- Scoped TypeScript check: zero diagnostics across 11 source/test files. Uses root compiler and dependencies through module resolution; no dependency directory/junction was created here.
- Scoped ESLint: zero errors and warnings across 11 source/test files. Uses root Expo config with an external temporary resolver config pointing to existing root dependencies. No dependencies were installed or changed.
- Full app lint/typecheck, export and native visual/touch validation are root integration checks. No Metro server, emulator, device session or provider was started by this worker.

After integration, run `npx tsx --test src/game/templates/map/logic.test.ts`, `npx expo lint`, and `npx tsc --noEmit` centrally. The current `npm test` globs do not include the nested template tests; add the new template test path centrally if it should be part of the full suite.

## QA acceptance walkthrough

On a QA project, add Route choices and Directions, connect the three actions, and run the route test. Try the app, compare Shortest walk and No stairs, open directions, inspect Library and Garden, then choose a route via each. Swap the endpoints and check the reverse instructions. In the builder, move the map, change colors and direction detail, remove one connection, and confirm the resulting failure and recovery. Reopen the saved QA project to check that root persistence retained substantive choices. Do not mark real learner lessons complete to exercise this template.

Documentation used: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [SVG](https://docs.expo.dev/versions/v57.0.0/sdk/svg/), [Universal Picker](https://docs.expo.dev/versions/v57.0.0/sdk/ui/universal/picker/), [Universal Host](https://docs.expo.dev/versions/v57.0.0/sdk/ui/universal/host/), and [React Native 0.86 Pressable](https://reactnative.dev/docs/0.86/pressable).
