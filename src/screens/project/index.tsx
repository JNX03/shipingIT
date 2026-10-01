import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, PageHeader } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { GameIcon } from '@/components/ui/game-icon';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Character, MissionArt } from '@/components/ui/character';
import { useAppStore } from '@/store/app-store';
import { getProjectProgress, projectFieldLabels } from '@/domain/project';
import { getMissionProgress, getNextLesson } from '@/domain/progression';
import { colors, radius, space } from '@/theme';

const stageIcons = [
  'discover',
  'profile',
  'idea',
  'idea',
  'scope',
  'prototype',
  'validate',
  'business',
  'build',
  'ship',
];

export function ProjectScreen() {
  const project = useAppStore((s) => s.project);
  const completed = useAppStore((s) => s.completedLessonIds);
  const progress = getProjectProgress(project);
  const [expanded, setExpanded] = useState<string | null>(progress.currentStage.id);
  const next = getNextLesson(completed);
  return (
    <Screen header={<PageHeader title="My notes" back />}>
      <View style={{ gap: space.lg }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit project name"
          onPress={() =>
            router.push({ pathname: '/project/edit/[field]', params: { field: 'name' } })
          }
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.lg,
            minHeight: 68,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <GameIcon name="project" size={56} />
          <View style={{ flex: 1, gap: space.xs }}>
            <T variant="heading">{project.name || 'Untitled project'}</T>
            <T variant="small">
              {progress.percent === 100
                ? 'Notes complete'
                : `Current stage: ${progress.currentStage.title}`}
            </T>
          </View>
          <Icon name="edit" size={21} color={colors.muted} />
        </Pressable>
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
            <ProgressBar value={progress.percent / 100} />
            <T variant="caption">{progress.percent}%</T>
          </View>
          <T variant="small">
            {progress.completedFields} of {progress.totalFields} notes written
          </T>
        </View>
      </View>
      <View
        style={{
          gap: space.md,
          paddingVertical: space.lg,
          borderTopWidth: 2,
          borderBottomWidth: 2,
          borderColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Character emotion="pointing" size={68} />
          <View style={{ flex: 1, gap: space.xs }}>
            <T variant="caption">{next ? `MISSION ${next.missionId}` : 'NEXT STEP'}</T>
            <T variant="subheading">{next ? next.title : 'Ready for your next step?'}</T>
            {next ? <T variant="small">{next.subtitle}</T> : null}
          </View>
        </View>
        <Button
          title={next ? 'Continue lesson' : 'Find opportunities'}
          onPress={() =>
            next
              ? router.push({ pathname: '/lesson/[id]', params: { id: next.id } })
              : router.push('/(tabs)/compete')
          }
        />
      </View>
      <View style={{ gap: space.md }}>
        <T variant="heading">Notes</T>
        <View
          style={{
            borderWidth: 2,
            borderColor: colors.border,
            borderRadius: radius.card,
            overflow: 'hidden',
          }}
        >
          {progress.stages.map((stage, index) => {
            const unlocked = getMissionProgress(stage.missionId, completed).unlocked;
            const open = expanded === stage.id && unlocked;
            return (
              <View
                key={stage.id}
                style={{ borderTopWidth: index ? 2 : 0, borderColor: colors.border }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${stage.title}, ${unlocked ? `${stage.completedFields} of ${stage.totalFields} notes written` : `locked until Mission ${stage.missionId}`}`}
                  accessibilityState={{ expanded: open, disabled: !unlocked }}
                  aria-expanded={open}
                  disabled={!unlocked}
                  onPress={() => setExpanded(open ? null : stage.id)}
                  style={({ pressed }) => ({
                    padding: space.lg,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.lg,
                    backgroundColor: pressed || open ? colors.surfaceMuted : colors.surface,
                  })}
                >
                  <GameIcon
                    name={!unlocked ? 'lock' : stage.complete ? 'check' : stageIcons[index]}
                    size={34}
                    variant={unlocked ? 'color' : 'muted'}
                  />
                  <View style={{ flex: 1, gap: space.xs }}>
                    <T
                      variant="subheading"
                      style={{ color: unlocked ? colors.text : colors.textSecondary }}
                    >
                      {stage.title}
                    </T>
                    <T variant="caption">
                      {unlocked
                        ? `${stage.completedFields}/${stage.totalFields} notes`
                        : `Opens in Mission ${stage.missionId}`}
                    </T>
                  </View>
                  {unlocked ? (
                    <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
                      <Icon name="next" color={colors.muted} size={19} />
                    </View>
                  ) : null}
                </Pressable>
                {open ? (
                  <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
                    {stage.completedFields === 0 ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: space.md,
                          paddingTop: space.md,
                        }}
                      >
                        <MissionArt mission="emptyProject" size={64} />
                        <T variant="small" style={{ flex: 1 }}>
                          Add your first note.
                        </T>
                      </View>
                    ) : null}
                    {stage.fields.map((field, fieldIndex) => (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${projectFieldLabels[field]}`}
                        key={field}
                        onPress={() =>
                          router.push({ pathname: '/project/edit/[field]', params: { field } })
                        }
                        style={({ pressed }) => ({
                          gap: space.xs,
                          paddingVertical: space.lg,
                          paddingHorizontal: space.sm,
                          borderTopWidth: fieldIndex ? 1 : 0,
                          borderColor: colors.border,
                          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
                        })}
                      >
                        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
                          <T variant="small" style={{ flex: 1, color: colors.primaryPressed }}>
                            {projectFieldLabels[field]}
                          </T>
                          <Icon name="edit" size={16} color={colors.muted} />
                        </View>
                        <T
                          numberOfLines={3}
                          style={{ color: project[field] ? colors.text : colors.textSecondary }}
                        >
                          {project[field] || 'Add a note'}
                        </T>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
      <Button
        title="Share project"
        variant="secondary"
        onPress={() => router.push('/project/pack')}
      />
      <T variant="caption">Keep plans and tested results separate.</T>
    </Screen>
  );
}
