import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { T } from '@/components/ui/text';
import {
  campusDataNotice,
  campusMapSize,
  campusPaths,
  campusPlaces,
  mapAccents,
} from './campus-data';
import { getCampusPlace } from './logic';
import type { CampusCompassDraft, CampusRoute, CampusTrip, MapPlaceId } from './types';

export interface CampusMapDiagramProps {
  draft: CampusCompassDraft;
  trip: CampusTrip;
  route: CampusRoute | null;
  inspectedPlace?: MapPlaceId;
}

/** Original vector diagram, responsive at narrow widths and rendered without a map provider. */
export function CampusMapDiagram({ draft, trip, route, inspectedPlace }: CampusMapDiagramProps) {
  const accent = mapAccents[draft.style.accent];
  const selectedPaths = new Set(route?.pathIds ?? []);
  const summary = route
    ? `${getCampusPlace(trip.origin).name} to ${getCampusPlace(trip.destination).name}, ${route.meters} meters, ${route.stairFlights} flights of stairs. Via ${route.nodes.map((id) => getCampusPlace(id).shortName).join(', ')}.`
    : 'Fictional campus diagram. No route drawn yet.';
  return (
    <View style={{ gap: 8 }} testID="campus-map-diagram">
      <View
        style={{
          borderRadius: 18,
          borderCurve: 'continuous',
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: '#D9E4DC',
          backgroundColor: accent.map,
          aspectRatio: campusMapSize.width / campusMapSize.height,
          width: '100%',
        }}
      >
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${campusMapSize.width} ${campusMapSize.height}`}
          accessible
          accessibilityRole="image"
          accessibilityLabel={summary}
        >
          <Rect x={0} y={0} width={340} height={380} fill={accent.map} />
          <Rect x={18} y={76} width={66} height={84} rx={25} fill="#D9EACA" />
          <Rect x={184} y={276} width={130} height={82} rx={24} fill="#E4EDD2" />
          <Path d="M190 160 Q215 140 231 158 Q246 186 221 204 Q188 208 185 179 Z" fill="#DBEBF2" />
          {[
            { x: 102, y: 92 },
            { x: 305, y: 205 },
            { x: 109, y: 306 },
            { x: 220, y: 54 },
            { x: 302, y: 54 },
          ].map((tree) => (
            <G key={`${tree.x}:${tree.y}`}>
              <Circle cx={tree.x} cy={tree.y} r={10} fill="#C6DFBF" />
              <Circle cx={tree.x - 3} cy={tree.y - 4} r={7} fill="#BDD8B5" />
            </G>
          ))}
          {campusPaths.map((path) => {
            const from = getCampusPlace(path.from);
            const to = getCampusPlace(path.to);
            const d = `M${from.x} ${from.y} L${to.x} ${to.y}`;
            return (
              <G key={path.id}>
                <Path d={d} fill="none" stroke="#FFFFFF" strokeWidth={15} strokeLinecap="round" />
                <Path
                  d={d}
                  fill="none"
                  stroke={path.terrain === 'stairs' ? '#BE8039' : '#CCD6CB'}
                  strokeWidth={selectedPaths.has(path.id) ? 8 : 4}
                  strokeDasharray={path.terrain === 'stairs' ? '3 6' : undefined}
                  strokeLinecap="round"
                />
                {selectedPaths.has(path.id) ? (
                  <Path
                    d={d}
                    fill="none"
                    stroke={accent.primary}
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeDasharray={path.terrain === 'stairs' ? '4 5' : undefined}
                  />
                ) : null}
              </G>
            );
          })}
          <Path
            d="M250 182 h19 M251 176 h19 M252 170 h19 M253 164 h19"
            stroke="#946025"
            strokeWidth={2}
          />
          {campusPlaces.map((place) => {
            const endpoint = place.id === trip.origin || place.id === trip.destination;
            const onRoute = route?.nodes.includes(place.id);
            const inspected = place.id === inspectedPlace;
            const label = draft.style.labels === 'all' || endpoint || inspected || onRoute;
            return (
              <G key={place.id}>
                {place.destination ? (
                  <Rect
                    x={place.x - 20}
                    y={place.y - 22}
                    width={40}
                    height={36}
                    rx={8}
                    fill={
                      place.id === 'lab' ? '#E3DDF2' : place.id === 'cafe' ? '#F1DFBE' : '#DFE9E4'
                    }
                    stroke="#B8C8BD"
                    strokeWidth={1}
                  />
                ) : null}
                {place.id === 'quad' ? (
                  <Circle
                    cx={place.x}
                    cy={place.y}
                    r={14}
                    fill="#BCDDE9"
                    stroke="#8DBCCC"
                    strokeWidth={2}
                  />
                ) : null}
                {inspected ? (
                  <Circle
                    cx={place.x}
                    cy={place.y}
                    r={18}
                    fill="none"
                    stroke={accent.primary}
                    strokeWidth={2}
                    strokeDasharray="3 3"
                  />
                ) : null}
                <Circle
                  cx={place.x}
                  cy={place.y}
                  r={endpoint ? 10 : 5}
                  fill={endpoint || onRoute ? accent.primary : '#FFFFFF'}
                  stroke={accent.primary}
                  strokeWidth={2}
                />
                {endpoint ? (
                  <SvgText
                    x={place.x}
                    y={place.y + 4}
                    fill="#FFFFFF"
                    fontSize={11}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {place.id === trip.origin ? 'A' : 'B'}
                  </SvgText>
                ) : null}
                {label ? (
                  <SvgText
                    x={place.x}
                    y={place.y + 30}
                    fill="#32443B"
                    fontSize={12}
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {place.shortName}
                  </SvgText>
                ) : null}
              </G>
            );
          })}
          <SvgText x={312} y={27} fill="#607069" fontSize={11} textAnchor="middle">
            N ↑
          </SvgText>
          <SvgText x={170} y={372} fill="#607069" fontSize={10} textAnchor="middle">
            Authored diagram · distances are practice data
          </SvgText>
        </Svg>
      </View>
      <T variant="caption" selectable>
        {campusDataNotice}
      </T>
      <T variant="small" selectable>
        A = start · B = destination · dashed brown path = stairs
      </T>
      {route ? (
        <T variant="small" selectable>
          {route.stairFlights === 0
            ? `Selected route: no stairs${route.rampCount ? ' · uses the west ramp' : ''}`
            : `Selected route: ${route.stairFlights} flights of stairs`}
        </T>
      ) : null}
    </View>
  );
}
