import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { T } from '@/components/ui/text';
import { colors, radius } from '@/theme';
import { mapAccents, mapPieceDefinitions } from './campus-data';
import { CampusChoice, CampusPlacePicker, CampusSection } from './controls';
import {
  campusDraftSignature,
  checkCampusCompassBuild,
  moveMapPiece,
  runCampusCompassTest,
} from './logic';
import { CampusMapDiagram } from './map-diagram';
import { CampusCompassPrototype } from './prototype';
import {
  mapActionIds,
  mapPieceIds,
  type CampusCompassDraft,
  type CampusTestResult,
  type MapAccent,
  type MapActionId,
} from './types';

const steps = [
  { id: 'pieces', title: '1. Pieces' },
  { id: 'order', title: '2. Order' },
  { id: 'style', title: '3. Style' },
  { id: 'actions', title: '4. Actions' },
  { id: 'test', title: '5. Test' },
] as const;

const connectionCopy: Record<MapActionId, { title: string; detail: string }> = {
  'plan-route': {
    title: 'From + to → Route choices',
    detail: 'Changing a place computes routes on the campus paths.',
  },
  'draw-route': {
    title: 'Route choices → Campus map',
    detail: 'Choosing a walk draws that exact path on the diagram.',
  },
  'read-directions': {
    title: 'Route choices → Directions',
    detail: 'Show directions explains each segment of the selected walk.',
  },
};

export interface CampusCompassBuilderProps {
  draft: CampusCompassDraft;
  onChange: (draft: CampusCompassDraft) => void;
  onTry?: () => void;
}

export function CampusCompassBuilder({ draft, onChange, onTry }: CampusCompassBuilderProps) {
  const [step, setStep] = useState<(typeof steps)[number]['id']>('pieces');
  const [test, setTest] = useState<CampusTestResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const check = checkCampusCompassBuild(draft);
  const currentTest = test?.signature === campusDraftSignature(draft) ? test : null;
  return (
    <View style={{ gap: 18 }} testID="campus-compass-builder">
      <T variant="small">Make a campus guide that helps someone reach the lab without stairs.</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {steps.map((entry) => (
          <View key={entry.id} style={{ flexGrow: 1, flexBasis: '28%' }}>
            <CampusChoice
              title={entry.title}
              selected={step === entry.id}
              onPress={() => setStep(entry.id)}
              testID={`campus-builder-${entry.id}`}
            />
          </View>
        ))}
      </View>
      {step === 'pieces' ? (
        <CampusSection title="Add useful screen pieces">
          <T variant="small">
            Your starting canvas has a place picker and a map. Add route choices and directions to
            make it work.
          </T>
          {mapPieceIds.map((id) => {
            const definition = mapPieceDefinitions[id];
            const included = draft.pieces.includes(id);
            return (
              <CampusChoice
                key={id}
                title={`${included ? 'Remove' : 'Add'} ${definition.title}`}
                detail={`${definition.detail}${definition.required ? ' Essential piece.' : ' Optional piece.'}`}
                selected={included}
                onPress={() =>
                  onChange({
                    ...draft,
                    pieces: included
                      ? draft.pieces.filter((piece) => piece !== id)
                      : [...draft.pieces, id],
                  })
                }
                testID={`campus-toggle-piece-${id}`}
              />
            );
          })}
        </CampusSection>
      ) : null}
      {step === 'order' ? (
        <CampusSection title="Arrange the screen">
          <T variant="small">
            Pieces appear in this order in your app. Move the map above or below the route choices
            and try both.
          </T>
          {draft.pieces.length === 0 ? (
            <T variant="small">Add a piece first.</T>
          ) : (
            draft.pieces.map((id, index) => (
              <View
                key={id}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.card,
                  padding: 12,
                  gap: 8,
                }}
              >
                <T variant="small">
                  {index + 1}. {mapPieceDefinitions[id].title}
                </T>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <CampusChoice
                      title="Move up"
                      disabled={index === 0}
                      onPress={() => onChange(moveMapPiece(draft, id, -1))}
                      testID={`campus-move-up-${id}`}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <CampusChoice
                      title="Move down"
                      disabled={index === draft.pieces.length - 1}
                      onPress={() => onChange(moveMapPiece(draft, id, 1))}
                      testID={`campus-move-down-${id}`}
                    />
                  </View>
                </View>
              </View>
            ))
          )}
        </CampusSection>
      ) : null}
      {step === 'style' ? (
        <View style={{ gap: 18 }}>
          <CampusSection title="Choose the map’s style">
            {(Object.keys(mapAccents) as MapAccent[]).map((accent) => (
              <CampusChoice
                key={accent}
                title={
                  accent === 'forest'
                    ? 'Forest green'
                    : accent === 'indigo'
                      ? 'Library indigo'
                      : 'Orchard amber'
                }
                selected={draft.style.accent === accent}
                onPress={() => onChange({ ...draft, style: { ...draft.style, accent } })}
                testID={`campus-accent-${accent}`}
              />
            ))}
            <CampusChoice
              title="Label every place"
              selected={draft.style.labels === 'all'}
              onPress={() => onChange({ ...draft, style: { ...draft.style, labels: 'all' } })}
            />
            <CampusChoice
              title="Label the route’s places"
              detail="Keep the diagram quieter while retaining start, finish and route landmarks."
              selected={draft.style.labels === 'key'}
              onPress={() => onChange({ ...draft, style: { ...draft.style, labels: 'key' } })}
            />
          </CampusSection>
          <CampusSection title="Choose direction detail">
            <CampusChoice
              title="Landmark clues"
              detail="Include the signs, fountain and entrance to look for."
              selected={draft.style.directions === 'landmarks'}
              onPress={() =>
                onChange({ ...draft, style: { ...draft.style, directions: 'landmarks' } })
              }
            />
            <CampusChoice
              title="Compact directions"
              detail="Show each place, distance and stair/ramp note."
              selected={draft.style.directions === 'compact'}
              onPress={() =>
                onChange({ ...draft, style: { ...draft.style, directions: 'compact' } })
              }
            />
          </CampusSection>
          <CampusSection title="Set the opening trip">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <CampusPlacePicker
                title="Starts at"
                value={draft.defaultTrip.origin}
                onChange={(origin) =>
                  onChange({ ...draft, defaultTrip: { ...draft.defaultTrip, origin } })
                }
                testID="campus-builder-origin"
              />
              <CampusPlacePicker
                title="Goes to"
                value={draft.defaultTrip.destination}
                onChange={(destination) =>
                  onChange({ ...draft, defaultTrip: { ...draft.defaultTrip, destination } })
                }
                testID="campus-builder-destination"
              />
            </View>
            <CampusChoice
              title="Open with shortest walk"
              selected={draft.defaultTrip.preference === 'fastest'}
              onPress={() =>
                onChange({ ...draft, defaultTrip: { ...draft.defaultTrip, preference: 'fastest' } })
              }
            />
            <CampusChoice
              title="Open with no stairs"
              selected={draft.defaultTrip.preference === 'step-free'}
              onPress={() =>
                onChange({
                  ...draft,
                  defaultTrip: { ...draft.defaultTrip, preference: 'step-free' },
                })
              }
            />
          </CampusSection>
        </View>
      ) : null}
      {step === 'actions' ? (
        <CampusSection title="Connect a choice to its result">
          <T variant="small">
            A screen piece needs a working action. Connect each path, then try removing one to see
            what stops working.
          </T>
          {mapActionIds.map((id) => {
            const connected = draft.connections.includes(id);
            return (
              <CampusChoice
                key={id}
                title={`${connected ? 'Disconnect' : 'Connect'} ${connectionCopy[id].title}`}
                detail={connectionCopy[id].detail}
                selected={connected}
                onPress={() =>
                  onChange({
                    ...draft,
                    connections: connected
                      ? draft.connections.filter((action) => action !== id)
                      : [...draft.connections, id],
                  })
                }
                testID={`campus-toggle-action-${id}`}
              />
            );
          })}
        </CampusSection>
      ) : null}
      {step === 'test' ? (
        <CampusSection title="Can I find the lab without stairs?">
          <T variant="small" selectable>
            Simulated check: choose South Gate → Science Lab, select “No stairs”, inspect the map,
            then read the directions.
          </T>
          <Button
            title="Run the route test"
            uppercase={false}
            onPress={() => setTest(runCampusCompassTest(draft))}
            testID="campus-run-test"
          />
          {test && !currentTest ? (
            <T variant="small" selectable>
              Your app changed. Run the test again to check this version.
            </T>
          ) : null}
          {currentTest ? (
            <View style={{ gap: 12 }} testID="campus-test-result">
              <T
                variant="subheading"
                accessibilityLiveRegion="polite"
                style={{ color: currentTest.passed ? colors.success : colors.danger }}
              >
                {currentTest.passed ? 'Route test passed' : 'Something needs a repair'}
              </T>
              {currentTest.checks.map((entry) => (
                <View
                  key={entry.id}
                  style={{
                    borderWidth: 1,
                    borderColor: entry.passed ? '#A5CBA5' : '#E1AEAE',
                    borderRadius: radius.card,
                    padding: 12,
                    gap: 4,
                  }}
                >
                  <T
                    variant="small"
                    style={{ color: entry.passed ? colors.success : colors.danger }}
                  >
                    {entry.passed ? '✓' : '×'} {entry.label}
                  </T>
                  <T variant="caption" selectable>
                    Expected: {entry.expected}
                  </T>
                  <T variant="small" selectable>
                    Actual: {entry.actual}
                  </T>
                </View>
              ))}
              <CampusMapDiagram
                draft={draft}
                trip={currentTest.plan.trip}
                route={currentTest.plan.mapRoute}
              />
              <T variant="caption" selectable>
                This checks authored practice data. Try the app yourself to check whether the labels
                and directions are clear.
              </T>
            </View>
          ) : null}
        </CampusSection>
      ) : null}
      <View
        style={{
          padding: 14,
          borderRadius: radius.card,
          backgroundColor: check.valid ? '#EDF6EA' : colors.peach,
          gap: 6,
        }}
      >
        <T variant="small" selectable accessibilityLiveRegion="polite">
          {check.message}
        </T>
        {check.issues.length > 1 ? (
          <T variant="caption">
            {check.issues.length} repairs left. Pieces and actions above show what to change.
          </T>
        ) : null}
      </View>
      {onTry ? (
        <Button
          title="Try CampusCompass"
          uppercase={false}
          onPress={onTry}
          testID="campus-try-app"
        />
      ) : null}
      <CampusChoice
        title={showPreview ? 'Hide live canvas' : 'Show live canvas'}
        onPress={() => setShowPreview(!showPreview)}
        testID="campus-toggle-preview"
      />
      {showPreview ? (
        <CampusCompassPrototype
          key={campusDraftSignature(draft)}
          draft={draft}
          onTripChange={(defaultTrip) => onChange({ ...draft, defaultTrip })}
        />
      ) : null}
    </View>
  );
}
