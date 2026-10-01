import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { colors, radius, space } from '@/theme';
import { feedback } from '@/utils/feedback';
import { DraggableItem, pointInRect, type DropEvent } from '../components/drag-item';
import { gamePropArt } from '../art';
import type { GameStageProps } from '../types';
import {
  checkResearchStage,
  featureById,
  featureCost,
  researchFeatures,
  scopeProblems,
  SCOPE_BUDGET,
} from '../logic/research';

export function ScopeStage({ draft, onChange, onComplete }: GameStageProps) {
  const compact = useWindowDimensions().height < 750;
  const latest = useRef(draft);
  const tray = useRef<View>(null);
  const shelf = useRef<View>(null);
  const [notice, setNotice] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    latest.current = draft;
  }, [draft]);
  const update = (featureIds: string[]) => {
    latest.current = { ...latest.current, scope: { featureIds } };
    onChange({ scope: { featureIds } });
  };
  const pack = (id: string) => {
    if (!featureById(id) || latest.current.scope.featureIds.includes(id)) return;
    const ids = [...latest.current.scope.featureIds, id];
    update(ids);
    const problems = scopeProblems(ids);
    setNotice(problems[0] || `${featureById(id)!.title} packed.`);
    feedback(problems.length ? 'error' : 'light');
  };
  const unpack = (id: string) => {
    if (!latest.current.scope.featureIds.includes(id)) return;
    const ids = latest.current.scope.featureIds.filter((item) => item !== id);
    update(ids);
    setNotice(scopeProblems(ids)[0] || `${featureById(id)?.title ?? 'Feature'} returned.`);
    setActiveIndex(
      Math.max(
        0,
        researchFeatures.findIndex((item) => item.id === id),
      ),
    );
    feedback('selection');
  };
  const drop = (event: DropEvent) => {
    let remaining = 2;
    let hit = false;
    const measured = (kind: 'tray' | 'shelf', view: View | null) => {
      if (!view) {
        remaining--;
        return;
      }
      view.measureInWindow((x, y, width, height) => {
        if (!hit && pointInRect(event, { x, y, width, height })) {
          hit = true;
          if (kind === 'tray') pack(event.id);
          else unpack(event.id);
        }
        remaining--;
        if (!remaining && !hit)
          setNotice('Drop in the tray to pack. Return to the shelf to unpack.');
      });
    };
    measured('tray', tray.current);
    measured('shelf', shelf.current);
  };
  const used = featureCost(draft.scope.featureIds);
  const over = used > SCOPE_BUDGET;
  const problems = scopeProblems(draft.scope.featureIds);
  const check = checkResearchStage('scope', draft);
  const activeFeature = researchFeatures[activeIndex];
  const packed = draft.scope.featureIds.includes(activeFeature.id);
  const cycle = (direction: number) => {
    setActiveIndex(
      (index) => (index + direction + researchFeatures.length) % researchFeatures.length,
    );
    feedback('selection');
  };
  return (
    <View style={styles.stage}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, compact && { padding: space.sm, gap: space.sm }]}
      >
        <View style={styles.budgetHeader}>
          <T variant="subheading">Build budget</T>
          <T variant="subheading" style={{ color: over ? colors.danger : colors.primaryPressed }}>
            {used}/{SCOPE_BUDGET}
          </T>
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Build budget used"
          accessibilityValue={{
            min: 0,
            max: SCOPE_BUDGET,
            now: Math.min(used, SCOPE_BUDGET),
            text: `${used} of ${SCOPE_BUDGET} points${over ? ', over budget' : ''}`,
          }}
          style={styles.budget}
        >
          {Array.from({ length: SCOPE_BUDGET }, (_, i) => (
            <View
              key={i}
              style={[
                styles.budgetUnit,
                {
                  backgroundColor:
                    i < used ? (over ? colors.danger : colors.primary) : colors.surfaceMuted,
                  borderColor:
                    i < used ? (over ? colors.danger : colors.primaryPressed) : colors.border,
                },
              ]}
            />
          ))}
        </View>
        <View
          ref={tray}
          collapsable={false}
          style={[
            styles.tray,
            {
              height: compact ? 144 : 180,
              borderColor: over
                ? colors.danger
                : check.valid
                  ? colors.secondaryPressed
                  : colors.primary,
            },
          ]}
        >
          <View style={styles.row}>
            <T variant="caption" style={{ flex: 1 }}>
              FIRST VERSION · DROP HERE
            </T>
            <T variant="caption">{draft.scope.featureIds.length} packed</T>
          </View>
          {draft.scope.featureIds.length ? (
            <ScrollView
              nestedScrollEnabled
              contentContainerStyle={styles.packedGrid}
              showsVerticalScrollIndicator
            >
              {draft.scope.featureIds.map((id) => {
                const feature = featureById(id);
                if (!feature) return null;
                const missing = feature.requires.some(
                  (required) => !draft.scope.featureIds.includes(required),
                );
                return (
                  <DraggableItem
                    key={id}
                    id={id}
                    haptic={false}
                    onDrop={drop}
                    onTap={() => unpack(id)}
                    accessibilityLabel={`${feature.title}, ${feature.cost} points, packed${missing ? ', missing dependency' : ''}. Tap to unpack or drag to shelf.`}
                    style={[
                      styles.packed,
                      { borderColor: missing ? colors.danger : colors.border },
                    ]}
                  >
                    <View
                      style={{ padding: space.sm, minHeight: 48, justifyContent: 'center', gap: 2 }}
                    >
                      <T variant="small" numberOfLines={2} style={{ color: colors.text }}>
                        {feature.title}
                      </T>
                      <T variant="caption">{feature.cost} pts · Unpack</T>
                    </View>
                  </DraggableItem>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyTray}>
              <Image
                source={gamePropArt.featureCrate}
                style={{ width: 64, height: 64 }}
                contentFit="contain"
                accessible={false}
              />
              <T variant="small" style={{ flex: 1 }}>
                Drag a feature into your first version.
              </T>
            </View>
          )}
        </View>
        <View ref={shelf} collapsable={false} style={{ gap: space.xs, zIndex: 20 }}>
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous feature"
              onPress={() => cycle(-1)}
              style={styles.arrow}
            >
              <Icon name="back" size={22} color={colors.primaryPressed} />
            </Pressable>
            <T variant="caption" style={{ flex: 1, textAlign: 'center' }}>
              SHELF {activeIndex + 1}/{researchFeatures.length} · RETURN HERE
            </T>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next feature"
              onPress={() => cycle(1)}
              style={styles.arrow}
            >
              <Icon name="next" size={22} color={colors.primaryPressed} />
            </Pressable>
          </View>
          <DraggableItem
            key={activeFeature.id}
            id={activeFeature.id}
            haptic={false}
            onDrop={drop}
            onTap={() => (packed ? unpack(activeFeature.id) : pack(activeFeature.id))}
            accessibilityLabel={`${activeFeature.title}, costs ${activeFeature.cost} build points${activeFeature.requires.length ? `, needs ${activeFeature.requires.map((id) => featureById(id)?.title).join(' and ')}` : ''}. ${packed ? 'Packed. Tap to unpack.' : 'Tap to pack.'}`}
            style={[
              styles.feature,
              {
                minHeight: compact ? 126 : 148,
                borderColor: packed ? colors.secondaryPressed : colors.accent,
              },
            ]}
          >
            <View style={{ padding: space.md, gap: space.xs }}>
              <View style={styles.row}>
                <T variant="subheading" style={{ flex: 1 }}>
                  {activeFeature.title}
                </T>
                <T variant="caption">{activeFeature.cost} pts</T>
              </View>
              <T variant="small" numberOfLines={2}>
                {activeFeature.description}
              </T>
              <T variant="caption" numberOfLines={2} style={{ color: colors.primaryPressed }}>
                {packed
                  ? 'PACKED · TAP TO UNPACK'
                  : activeFeature.requires.length
                    ? `Needs ${activeFeature.requires.map((id) => featureById(id)?.title).join(' + ')}`
                    : 'HOLD + DRAG OR TAP TO PACK'}
              </T>
            </View>
          </DraggableItem>
        </View>
      </ScrollView>
      <View style={[styles.footer, compact && { padding: space.md }]}>
        <T
          accessibilityLiveRegion="polite"
          variant="small"
          style={{
            color: check.valid ? colors.success : problems.length ? colors.danger : colors.text,
          }}
        >
          {check.valid
            ? 'Seven points. One useful loop.'
            : notice || problems[0] || 'Keep the queue useful and current.'}
        </T>
        <Button
          title="Design this version"
          haptic={false}
          disabled={!check.valid}
          onPress={() => {
            if (checkResearchStage('scope', latest.current).valid) onComplete();
          }}
        />
      </View>
    </View>
  );
}
export default ScopeStage;
const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space.lg, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  budget: { flexDirection: 'row', gap: space.xs },
  budgetUnit: { flex: 1, height: 16, borderRadius: 5, borderWidth: 2, borderBottomWidth: 4 },
  tray: {
    borderWidth: 3,
    borderBottomWidth: 6,
    borderRadius: radius.control,
    padding: space.sm,
    gap: space.xs,
    backgroundColor: colors.primarySurface,
  },
  emptyTray: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.sm,
  },
  packedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, paddingBottom: space.xs },
  packed: {
    flexBasis: '46%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: radius.sm,
  },
  arrow: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  feature: {
    backgroundColor: colors.peach,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderRadius: radius.sm,
  },
  footer: {
    padding: space.lg,
    gap: space.sm,
    borderTopWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
