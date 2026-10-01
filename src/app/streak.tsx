import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useLocalDay } from '@/components/profile/use-local-day';
import { useAppStore } from '@/store/app-store';
import { useAdventure } from '@/game/store';
import { useChallenges } from '@/game/challenge-store';
import { ProfileToolbar } from '@/game/components/profile-chrome';
import { gamePropArt } from '@/game/art';
import { combinedActivityDates, practiceActivityDates } from '@/game/activity';
import { buildProfileCalendar, getProfileStreakSummary, shiftCalendarMonth } from '@/game/profile-calendar';
import { colors, fonts, radius, space } from '@/theme';

const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function Streak() {
  const lessonDates = useAppStore((state) => state.activityDates);
  const gameDates = useAdventure((state) => state.activityDates);
  const practiceCompleted = useChallenges((state) => state.completed);
  const now = useLocalDay();
  const [month, setMonth] = useState(() => shiftCalendarMonth(now, 0));
  const summary = getProfileStreakSummary(combinedActivityDates(lessonDates, gameDates, practiceActivityDates(practiceCompleted, now)), now);
  const calendar = buildProfileCalendar(month, summary.dates, now);
  const weeks = Array.from({ length: calendar.cells.length / 7 }, (_, index) =>
    calendar.cells.slice(index * 7, index * 7 + 7),
  );

  return (
    <Screen
      contentWidth={520}
      style={styles.screen}
      header={<ProfileToolbar title="Your streak" back />}
      footer={<Button title="Continue" uppercase={false} onPress={() => router.replace('/(tabs)')} />}
      footerContentStyle={{ maxWidth: 480 }}
    >
      <View style={styles.hero}>
        <View style={styles.heroMain}>
          <View style={styles.counter} accessible accessibilityLabel={`${summary.current} day streak. Best streak: ${summary.longest} days.`}>
            <T maxFontSizeMultiplier={1.15} style={[styles.number, summary.current >= 1000 && styles.longNumber]}>
              {summary.current}
            </T>
            <T variant="heading" style={styles.heroText}>day streak</T>
            <T variant="small" style={styles.heroText}>
              Best: {summary.longest} {summary.longest === 1 ? 'day' : 'days'}
            </T>
          </View>
          <Image
            source={gamePropArt.spark}
            contentFit="contain"
            style={styles.spark}
            accessible={false}
            alt=""
          />
        </View>
        <View style={styles.status} accessibilityLiveRegion="polite">
          <T variant="subheading" style={{ color: colors.dark }}>
            {summary.completedToday ? 'Today is counted' : summary.current ? 'Keep your streak going' : 'Start with one good day'}
          </T>
          <T variant="small" style={{ color: colors.text }}>
            {summary.completedToday
              ? 'You finished a stage or lesson. Come back tomorrow for another day.'
              : 'Finish a game stage or lesson today. Each calendar day counts once.'}
          </T>
        </View>
      </View>

      <View style={styles.history}>
        <T variant="heading" accessibilityRole="header">Your activity calendar</T>
        <View style={styles.calendar}>
          <View style={styles.monthHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              accessibilityState={{ disabled: !calendar.canGoBack }}
              disabled={!calendar.canGoBack}
              onPress={() => setMonth(shiftCalendarMonth(calendar.month, -1))}
              style={({ pressed }) => [styles.monthButton, pressed && styles.pressed, !calendar.canGoBack && styles.disabled]}
            >
              <T variant="small" style={styles.monthButtonText}>Prev</T>
            </Pressable>
            <T variant="subheading" accessibilityLiveRegion="polite" style={styles.monthTitle}>
              {calendar.title}
            </T>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              accessibilityState={{ disabled: !calendar.canGoForward }}
              disabled={!calendar.canGoForward}
              onPress={() => setMonth(shiftCalendarMonth(calendar.month, 1))}
              style={({ pressed }) => [styles.monthButton, pressed && styles.pressed, !calendar.canGoForward && styles.disabled]}
            >
              <T variant="small" style={styles.monthButtonText}>Next</T>
            </Pressable>
          </View>
          <View style={styles.week} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {weekdays.map((day) => <T key={day} variant="caption" style={styles.weekday}>{day}</T>)}
          </View>
          {weeks.map((week, index) => (
            <View key={index} style={styles.week}>
              {week.map((day, dayIndex) => day ? (
                <View
                  key={day.key}
                  accessible
                  accessibilityLabel={`${day.spoken}${day.today ? ', today' : ''}: ${day.done ? 'stage or lesson completed' : day.future ? 'upcoming' : 'no activity recorded'}`}
                  testID={`streak-day-${day.key}`}
                  style={[styles.day, day.done && styles.doneDay, day.today && styles.today]}
                >
                  <T variant="small" maxFontSizeMultiplier={1.5} style={[styles.date, day.future && styles.futureDate]}>
                    {day.date}
                  </T>
                  <T variant="caption" maxFontSizeMultiplier={1.25} style={styles.dayStatus}>
                    {day.today ? 'Today' : day.done ? 'Done' : ''}
                  </T>
                  {day.today && day.done ? <T variant="caption" maxFontSizeMultiplier={1.25} style={styles.dayStatus}>Done</T> : null}
                </View>
              ) : <View key={`empty-${dayIndex}`} style={styles.day} />)}
            </View>
          ))}
          <T variant="small" style={styles.monthSummary}>
            {calendar.completedDays} {calendar.completedDays === 1 ? 'active day' : 'active days'} in {calendar.title}.
          </T>
        </View>
        <T variant="small" style={styles.explanation}>
          A completed game stage or lesson marks the day. Your calendar combines both, with no extra days for doing more on the same date.
        </T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, paddingTop: 0, paddingBottom: space.xl, gap: 0 },
  hero: { backgroundColor: colors.streak, padding: space.page, gap: space.lg },
  heroMain: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  counter: { flex: 1, minWidth: 0, gap: space.xs },
  number: { fontFamily: fonts.heavy, fontSize: 72, lineHeight: 82, color: colors.dark, fontVariant: ['tabular-nums'] },
  longNumber: { fontSize: 44, lineHeight: 54 },
  heroText: { color: colors.dark },
  spark: { width: 116, height: 132 },
  status: { backgroundColor: colors.peach, borderRadius: radius.large, padding: space.lg, gap: space.xs },
  history: { padding: space.lg, gap: space.lg },
  calendar: { borderWidth: 2, borderColor: colors.border, borderRadius: radius.large, padding: space.sm, gap: space.sm },
  monthHeader: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  monthTitle: { flex: 1, minWidth: 0, textAlign: 'center', color: colors.text },
  monthButton: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: radius.sm },
  monthButtonText: { color: colors.primaryPressed, fontFamily: fonts.bold },
  pressed: { backgroundColor: colors.primarySurface },
  disabled: { opacity: 0.4 },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', color: colors.textSecondary },
  day: { flex: 1, minWidth: 0, minHeight: 68, alignItems: 'center', justifyContent: 'flex-start', paddingTop: space.xs, borderWidth: 2, borderColor: 'transparent', borderRadius: radius.sm },
  doneDay: { backgroundColor: colors.peach },
  today: { borderColor: colors.warning },
  date: { color: colors.text, fontFamily: fonts.bold },
  futureDate: { color: colors.textSecondary },
  dayStatus: { color: colors.warning, fontSize: 10, lineHeight: 14, textAlign: 'center' },
  monthSummary: { color: colors.textSecondary, textAlign: 'center', paddingVertical: space.sm },
  explanation: { color: colors.textSecondary },
});
