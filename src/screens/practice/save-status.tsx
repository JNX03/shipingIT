import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { T } from '@/components/ui/text';
import { colors, space } from '@/theme';
import { optionalPractice } from '@/game/practice/runtime';
import type { PracticeSnapshot } from '@/game/practice/session';

export function PracticeSaveStatus({ state }: { state: PracticeSnapshot }) {
  if (!state.saveError) return null;
  return (
    <View style={{ gap: space.sm }}>
      <T
        selectable
        variant="small"
        accessibilityLiveRegion="polite"
        style={{ color: colors.danger }}
      >
        {state.saveError}
      </T>
      <Button
        title={state.protected ? 'Retry loading practice' : 'Retry saving draft'}
        variant="secondary"
        compact
        uppercase={false}
        onPress={() => {
          void optionalPractice.retry();
        }}
      />
    </View>
  );
}
