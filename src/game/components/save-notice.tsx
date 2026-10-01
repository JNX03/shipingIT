import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { T } from '@/components/ui/text';
import { colors, space } from '@/theme';
import { useAdventure } from '../store';

export function AdventureSaveNotice() {
  const error = useAdventure(s => s.error);
  const retry = useAdventure(s => s.retry);
  const [busy, setBusy] = useState(false);
  if (!error) return null;
  return <View accessibilityLiveRegion="assertive" style={{ padding: space.md, gap: space.sm, backgroundColor: colors.dangerSurface }}>
    <T variant="small" style={{ color: colors.danger }}>{error}</T>
    <Button compact title="Retry saving adventure" variant="secondary" loading={busy} onPress={async () => { setBusy(true); try { await retry(); } finally { setBusy(false); } }} />
  </View>;
}
