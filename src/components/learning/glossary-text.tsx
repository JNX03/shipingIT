import { useState } from 'react';
import { View, type TextProps } from 'react-native';
import { T } from '@/components/ui/text';
import { storyGlossary, type StoryGlossaryId } from '@/data/storybook';
import { colors, radius, space, typography } from '@/theme';

export function glossaryParts(text: string, ids: readonly StoryGlossaryId[]): { text: string; id?: StoryGlossaryId }[] {
  const words = [...new Set(ids)].slice(0, 8).filter((id) => id in storyGlossary);
  if (!words.length) return [{ text }];
  const names = words.map((id) => storyGlossary[id].english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`\\b(?:${names.sort((a, b) => b.length - a.length).join('|')})\\b`, 'gi');
  const parts: { text: string; id?: StoryGlossaryId }[] = [];
  let offset = 0;
  let highlighted = 0;
  for (const match of text.matchAll(pattern)) {
    if (highlighted >= 8) break;
    const index = match.index;
    if (index > offset) parts.push({ text: text.slice(offset, index) });
    const id = words.find((word) => storyGlossary[word].english.toLowerCase() === match[0].toLowerCase());
    parts.push({ text: match[0], id });
    highlighted++;
    offset = index + match[0].length;
  }
  if (offset < text.length) parts.push({ text: text.slice(offset) });
  return parts.length ? parts : [{ text }];
}

/** Only authored terms present in this sentence open their one meaning. */
export function GlossaryText({ text, ids = [], variant = 'body', ...textProps }: Omit<TextProps, 'children'> & {
  text: string; ids?: readonly StoryGlossaryId[]; variant?: keyof typeof typography;
}) {
  const [selected, setSelected] = useState<StoryGlossaryId | null>(null);
  return <View style={{ gap: space.xs }}>
    <T variant={variant} {...textProps}>{glossaryParts(text, ids).map((part, index) => part.id ? (
      <T key={index} variant={variant} accessibilityRole="button" accessibilityLabel={`Meaning of ${part.text}`} accessibilityState={{ expanded: selected === part.id }} onPress={() => setSelected(selected === part.id ? null : part.id!)} style={{ color: colors.primaryPressed, textDecorationLine: 'underline', textDecorationStyle: 'dotted' }}>{part.text}</T>
    ) : part.text)}</T>
    {selected ? <View style={{ padding: space.sm, borderRadius: radius.control, backgroundColor: colors.primarySurface }}><T variant="small" accessibilityLiveRegion="polite">{storyGlossary[selected].meaning}</T></View> : null}
  </View>;
}
