import { useState } from 'react';
import { View } from 'react-native';
import type { TaskGuide } from '@/data/learning-guides/types';
import { Button } from '@/components/ui/button';
import { T } from '@/components/ui/text';
import { colors, radius, space } from '@/theme';

export function TaskBriefing({ guide }: { guide?: TaskGuide }) {
  const [showSteps, setShowSteps] = useState(false);
  if (!guide) return null;
  return (
    <View style={{ gap: space.sm }}>
      <Button
        title={showSteps ? 'Hide help' : 'How to play'}
        variant="quiet"
        compact
        uppercase={false}
        onPress={() => setShowSteps(!showSteps)}
      />
      {showSteps ? (
        <View style={{ gap: space.sm, padding: space.md, borderRadius: radius.large, backgroundColor: colors.primarySurface }}>
          <T variant="subheading">{guide.goal}</T>
          <T variant="small">{guide.why}</T>
          {guide.steps.map((step, index) => (
            <T key={index} variant="small">{index + 1}. {step}</T>
          ))}
        </View>
      ) : null}
    </View>
  );
}
