import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { T } from '@/components/ui/text';
import { colors, radius } from '@/theme';
import { campusDataNotice, campusName, campusPlaces, mapAccents } from './campus-data';
import { CampusChoice, CampusPlacePicker, CampusSection } from './controls';
import { getCampusPlace, planCampusTrip } from './logic';
import { CampusMapDiagram } from './map-diagram';
import type {
  CampusCompassDraft,
  CampusInteraction,
  CampusTrip,
  MapPieceId,
  MapPlaceId,
} from './types';

export interface CampusCompassPrototypeProps {
  draft: CampusCompassDraft;
  onInteraction?: (interaction: CampusInteraction) => void;
  onTripChange?: (trip: CampusTrip) => void;
}

export function CampusCompassPrototype({
  draft,
  onInteraction,
  onTripChange,
}: CampusCompassPrototypeProps) {
  const [trip, setTrip] = useState<CampusTrip>(draft.defaultTrip);
  const [inspected, setInspected] = useState<MapPlaceId | undefined>(draft.defaultTrip.landmark);
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const plan = planCampusTrip(draft, trip);
  const accent = mapAccents[draft.style.accent];

  function changeTrip(next: CampusTrip, kind: CampusInteraction['kind']) {
    setTrip(next);
    setDirectionsOpen(false);
    onTripChange?.(next);
    onInteraction?.({ kind, trip: next, routeId: planCampusTrip(draft, next).route?.id });
  }

  const sections: Record<MapPieceId, () => React.JSX.Element> = {
    places: () => (
      <CampusSection title="Where are you going?">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <CampusPlacePicker
            title="From"
            value={trip.origin}
            onChange={(origin) => changeTrip({ ...trip, origin }, 'places-changed')}
            testID="campus-origin"
          />
          <CampusPlacePicker
            title="To"
            value={trip.destination}
            onChange={(destination) => changeTrip({ ...trip, destination }, 'places-changed')}
            testID="campus-destination"
          />
        </View>
        <CampusChoice
          title="Swap start and destination"
          onPress={() =>
            changeTrip(
              { ...trip, origin: trip.destination, destination: trip.origin },
              'places-changed',
            )
          }
          testID="campus-swap"
        />
      </CampusSection>
    ),
    routes: () => (
      <CampusSection title="Choose a walk">
        {plan.options.length === 0 ? (
          <T variant="small" selectable>
            {plan.message}
          </T>
        ) : (
          plan.options.map((route) => (
            <CampusChoice
              key={route.id}
              title={route.title}
              detail={`${route.minutes} min · ${route.meters} m · ${route.stairFlights ? `${route.stairFlights} flights of stairs` : 'no stairs'}${route.rampCount ? ' · ramp' : ''}`}
              selected={route.preference === trip.preference}
              onPress={() =>
                changeTrip({ ...trip, preference: route.preference }, 'route-selected')
              }
              testID={`campus-route-${route.preference}`}
            />
          ))
        )}
        {plan.options.length > 0 ? (
          <T variant="caption" selectable>
            The shorter lab shortcut has stairs. The ramp path takes longer.
          </T>
        ) : null}
      </CampusSection>
    ),
    map: () => (
      <CampusSection title="Your campus route">
        <CampusMapDiagram
          draft={draft}
          trip={trip}
          route={plan.mapRoute}
          inspectedPlace={inspected}
        />
        {plan.route && !plan.mapRoute ? (
          <T variant="small" selectable>
            Connect Route choices → Campus map to draw this walk.
          </T>
        ) : null}
        <T variant="small" selectable accessibilityLiveRegion="polite">
          {plan.message || 'Choose your start and destination.'}
        </T>
      </CampusSection>
    ),
    directions: () => (
      <CampusSection title="Follow the route">
        <Button
          title={directionsOpen ? 'Hide directions' : 'Show directions'}
          uppercase={false}
          variant="secondary"
          testID="campus-show-directions"
          onPress={() => {
            setDirectionsOpen(!directionsOpen);
            if (!directionsOpen)
              onInteraction?.({ kind: 'directions-opened', trip, routeId: plan.route?.id });
          }}
        />
        {directionsOpen ? (
          <View style={{ gap: 10 }} testID="campus-directions">
            {!draft.connections.includes('read-directions') ? (
              <T variant="small" selectable>
                Connect Route choices → Directions to explain the walk.
              </T>
            ) : !plan.route ? (
              <T variant="small" selectable>
                {plan.message}
              </T>
            ) : plan.route.meters === 0 ? (
              <T variant="small" selectable>
                You are already at {getCampusPlace(trip.destination).name}.
              </T>
            ) : (
              plan.directions.map((step, index) => (
                <View
                  key={step.id}
                  style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}
                >
                  <T variant="caption" style={{ color: accent.primary, paddingTop: 2 }}>
                    {index + 1}.
                  </T>
                  <T variant="small" selectable style={{ flex: 1 }}>
                    {step.text}
                  </T>
                </View>
              ))
            )}
            {plan.directions.length ? (
              <T variant="small" selectable style={{ color: accent.primary }}>
                Arrive at {getCampusPlace(trip.destination).name}.
              </T>
            ) : null}
          </View>
        ) : null}
      </CampusSection>
    ),
    landmarks: () => (
      <CampusSection title="Look for a landmark">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {campusPlaces
            .filter((place) =>
              ['library', 'garden', 'quad', 'ramp', 'stairs', 'lab'].includes(place.id),
            )
            .map((place) => (
              <View key={place.id} style={{ flexGrow: 1, flexBasis: '42%' }}>
                <CampusChoice
                  title={place.shortName}
                  selected={inspected === place.id}
                  onPress={() => {
                    setInspected(place.id);
                    changeTrip({ ...trip, landmark: place.id }, 'landmark-inspected');
                  }}
                  testID={`campus-inspect-${place.id}`}
                />
              </View>
            ))}
        </View>
        {inspected ? (
          <View
            style={{
              padding: 14,
              borderRadius: radius.card,
              backgroundColor: accent.soft,
              gap: 10,
            }}
            testID="campus-landmark-detail"
          >
            <T variant="small" selectable style={{ color: accent.primary }}>
              {getCampusPlace(inspected).description}
            </T>
            <CampusChoice
              title={`Walk via ${getCampusPlace(inspected).shortName}`}
              detail="Use a stairs-free path through this landmark."
              onPress={() =>
                changeTrip(
                  { ...trip, landmark: inspected, preference: 'landmark' },
                  'landmark-selected',
                )
              }
              testID="campus-via-landmark"
            />
          </View>
        ) : (
          <T variant="small">Tap a landmark to inspect its sign and path.</T>
        )}
      </CampusSection>
    ),
  };

  return (
    <View
      style={{
        gap: 18,
        borderWidth: 2,
        borderColor: accent.primary,
        borderRadius: 24,
        borderCurve: 'continuous',
        backgroundColor: colors.surface,
        padding: 16,
        width: '100%',
      }}
      testID="campus-compass-prototype"
    >
      <View style={{ gap: 4 }}>
        <T variant="heading" style={{ color: accent.primary }}>
          CampusCompass
        </T>
        <T variant="small">{campusName}</T>
        <T variant="caption" selectable>
          {campusDataNotice}
        </T>
      </View>
      {draft.pieces.length === 0 ? (
        <T variant="small">Your canvas is empty. Add a screen piece in the builder.</T>
      ) : (
        draft.pieces.map((id) => (
          <View key={id} testID={`campus-piece-${id}`}>
            {sections[id]()}
          </View>
        ))
      )}
    </View>
  );
}
