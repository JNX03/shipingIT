import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { T } from '@/components/ui/text';
import { colors, space } from '@/theme';
import { projectLibrary, useProjectLibrary } from '../project-library';

export function ProjectLibraryNotice() {
  const library = useProjectLibrary();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  if (!library.error) return null;
  return (
    <View
      accessibilityLiveRegion="assertive"
      style={{ padding: space.md, gap: space.sm, backgroundColor: colors.dangerSurface }}
    >
      <T variant="small" style={{ color: colors.danger }}>
        {library.error}
      </T>
      <Button
        title={library.readBlocked ? 'Retry loading app choices' : 'Retry saving app choices'}
        compact
        variant="secondary"
        loading={busy}
        onPress={async () => {
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          try {
            await projectLibrary.retry();
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
      />
    </View>
  );
}
