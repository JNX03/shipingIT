import { StyleSheet, View } from 'react-native';
import { T } from '@/components/ui/text';
import { colors } from '@/theme';
import { GameActor } from './actor';

export type LoadingScene = 'studio' | 'travel' | 'thinking';
const sceneTips: Record<LoadingScene, string> = {
  studio: 'A clear next step is the start of a useful prototype.',
  travel: 'Ask about a real experience. Listen for what happened.',
  thinking: 'Evidence describes what people do, not what we assume.',
};

/** Presentation only: readiness and bounded navigation transitions belong to the caller. */
export function GameLoading({
  message = 'Opening your studio…', scene = 'studio', compact = false, tip,
}: { message?: string; scene?: LoadingScene; compact?: boolean; tip?: string }) {
  return (
    <View accessibilityLiveRegion="polite" testID="game-loading" style={[styles.container, compact && styles.compact]}>
      <View style={styles.actorStage}>
        <View style={styles.ground} />
        <GameActor motion={scene === 'travel' ? 'walk' : scene === 'thinking' ? 'thinking' : 'talk'} size={compact ? 108 : 154} />
      </View>
      <T variant="subheading" style={styles.message}>{message}</T>
      <T variant="small" style={styles.tip}>{tip ?? sceneTips[scene]}</T>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20, backgroundColor: colors.surface, padding: 24 },
  compact: { flex: 0, padding: 16, gap: 12 },
  actorStage: { alignItems: 'center', justifyContent: 'center' },
  ground: { position: 'absolute', bottom: 9, width: '46%', height: 5, borderRadius: 8, backgroundColor: '#C9CDD4' },
  message: { textAlign: 'center', color: colors.textSecondary },
  tip: { textAlign: 'center', maxWidth: 290, color: colors.textSecondary },
});
