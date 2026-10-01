import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  View,
  Linking,
  type ListRenderItem,
  type ImageSourcePropType,
} from 'react-native';
import { Image } from 'expo-image';
import { useAppStore } from '@/store/app-store';
import { opportunityProvider } from '@/services/opportunities';
import type { Opportunity, OpportunityCategory, OpportunityResult } from '@/services/contracts';
import { Screen, PageHeader } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { Field } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { GameActor } from '@/game/components/actor';
import { gamePropArt, gameStageArt } from '@/game/art';
import { colors, radius, space } from '@/theme';

const categoryArt: Record<OpportunityCategory, ImageSourcePropType> = {
  innovation: gameStageArt.insight,
  startup: gameStageArt.launch,
  hackathon: gameStageArt.design,
  ai: gameStageArt.insight,
  research: gamePropArt.evidence,
  coding: gameStageArt.connect,
  science: gameStageArt.insight,
  design: gameStageArt.design,
  entrepreneurship: gameStageArt.scope,
};
const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const keyExtractor = (item: Opportunity) => item.id;
function Separator() {
  return <View style={{ height: 2, backgroundColor: colors.border }} />;
}

const OpportunityRow = memo(function OpportunityRow({
  item,
  linkError,
  onOpen,
}: {
  item: Opportunity;
  linkError?: string;
  onOpen: (item: Opportunity) => void;
}) {
  return (
    <View style={{ paddingVertical: space.xl, gap: space.md }}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`View ${item.title} on DekPort`}
        onPress={() => onOpen(item)}
        style={({ pressed }) => ({ gap: space.md, opacity: pressed ? 0.65 : 1 })}
      >
        <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
          <Image
            source={categoryArt[item.category]}
            style={{ width: 38, height: 38 }}
            contentFit="contain"
            accessible={false}
          />
          <View style={{ flex: 1, gap: space.xs }}>
            <T
              variant="caption"
              style={{ textTransform: 'uppercase', color: colors.primaryPressed }}
            >
              {item.category}
            </T>
            <T variant="small" numberOfLines={1}>
              {item.organizer}
            </T>
          </View>
          <Icon name="external" color={colors.muted} size={20} />
        </View>
        <T variant="subheading">{item.title}</T>
        <T variant="small" numberOfLines={2}>
          {item.description}
        </T>
        <T
          variant="small"
          style={{
            color:
              item.status === 'closed'
                ? colors.danger
                : item.status === 'open'
                  ? colors.success
                  : colors.textSecondary,
          }}
        >
          {item.status === 'closed'
            ? 'Applications closed'
            : item.status === 'open'
              ? 'Registration listed as open'
              : 'Check registration status'}
          {item.deadline ? ` · ${dateLabel(item.deadline)}` : ''}
        </T>
        <T variant="caption">
          {item.location || 'Location: check organizer'}
          {item.online && !/online|ออนไลน์/i.test(item.location) ? ' · Online' : ''}
        </T>
        {item.matchReason && !item.matchReason.startsWith('Listed by DekPort') ? (
          <T variant="caption">{item.matchReason}</T>
        ) : null}
        <T variant="caption" style={{ color: colors.primaryPressed }}>
          VIEW ON DEKPORT
        </T>
      </Pressable>
      {linkError ? (
        <T accessibilityLiveRegion="polite" variant="small" style={{ color: colors.danger }}>
          {linkError}
        </T>
      ) : null}
    </View>
  );
});

export function CompeteScreen() {
  const project = useAppStore((s) => s.project);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<OpportunityCategory | 'all'>('all');
  const [result, setResult] = useState<OpportunityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [linkError, setLinkError] = useState<{ id: string; message: string } | null>(null);
  const [refreshRequest, setRefreshRequest] = useState(0);
  const consumedRefresh = useRef(0);
  useEffect(() => {
    const abort = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      const forceRefresh = consumedRefresh.current !== refreshRequest;
      consumedRefresh.current = refreshRequest;
      void opportunityProvider
        .list({ query, category, project, forceRefresh }, abort.signal)
        .then((data) => {
          if (!abort.signal.aborted) setResult(data);
        })
        .catch(() => {
          if (!abort.signal.aborted)
            setError('Couldn’t load opportunities. Check your connection and try again.');
        })
        .finally(() => {
          if (!abort.signal.aborted) setLoading(false);
        });
    }, 220);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [query, category, project, refreshRequest]);
  const refresh = useCallback(() => {
    if (!loading) {
      setLoading(true);
      setRefreshRequest((value) => value + 1);
    }
  }, [loading]);
  const openOpportunity = useCallback((item: Opportunity) => {
    setLinkError(null);
    void Linking.openURL(item.url).catch(() =>
      setLinkError({ id: item.id, message: 'The link could not open. Please try again.' }),
    );
  }, []);
  const renderItem: ListRenderItem<Opportunity> = useCallback(
    ({ item }) => (
      <OpportunityRow
        item={item}
        linkError={linkError?.id === item.id ? linkError.message : undefined}
        onOpen={openOpportunity}
      />
    ),
    [linkError, openOpportunity],
  );
  const clearFilters = () => {
    setQuery('');
    setCategory('all');
  };
  const header = (
    <View
      style={{
        gap: space.lg,
        paddingBottom: space.lg,
        borderBottomWidth: 2,
        borderColor: colors.border,
      }}
    >
      <Field
        label="Search opportunities"
        value={query}
        onChangeText={setQuery}
        placeholder="Competitions, AI, design…"
        multiline={false}
        maxLength={120}
        inputProps={{ returnKeyType: 'search' }}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.sm }}
      >
        {(['all', 'innovation', 'hackathon', 'startup', 'research'] as const).map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={item[0].toUpperCase() + item.slice(1)}
            accessibilityState={{ selected: category === item }}
            aria-selected={category === item}
            onPress={() => setCategory(item)}
            style={({ pressed }) => ({
              minHeight: 44,
              justifyContent: 'center',
              paddingHorizontal: space.lg,
              borderWidth: 2,
              borderRadius: radius.control,
              borderColor: category === item ? colors.primary : colors.border,
              backgroundColor:
                category === item
                  ? colors.primarySurface
                  : pressed
                    ? colors.surfaceMuted
                    : colors.surface,
            })}
          >
            <T
              variant="small"
              style={{ color: category === item ? colors.primaryPressed : colors.text }}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </T>
          </Pressable>
        ))}
      </ScrollView>
      {result ? (
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
            <View style={{ flex: 1, gap: space.xs }}>
              <T variant="caption">
                {result.source === 'live'
                  ? 'LIVE FROM DEKPORT'
                  : result.source === 'cache'
                    ? 'SAVED OPPORTUNITIES'
                    : result.source === 'snapshot'
                      ? 'DEKPORT SNAPSHOT'
                      : 'OFFLINE'}{' '}
                · {result.items.length} RESULTS
              </T>
              {result.fetchedAt ? (
                <T variant="caption">Retrieved {dateLabel(result.fetchedAt)}</T>
              ) : null}
            </View>
            {loading ? (
              <ActivityIndicator
                color={colors.primary}
                accessibilityLabel="Refreshing opportunities"
              />
            ) : (
              <Button title="Refresh" variant="quiet" compact onPress={refresh} />
            )}
          </View>
          <T variant="small">
            {result.message || 'Check age, team, and submission requirements on the event page.'}
          </T>
        </View>
      ) : null}
      {error && result ? (
        <View accessibilityLiveRegion="polite" style={{ gap: space.md }}>
          <T style={{ color: colors.danger }}>{error}</T>
          <Button title="Try again" variant="secondary" disabled={loading} onPress={refresh} />
        </View>
      ) : null}
    </View>
  );
  const empty =
    !result && loading ? (
      <View
        accessibilityLiveRegion="polite"
        style={{ alignItems: 'center', gap: space.md, padding: space.xl }}
      >
        <GameActor size={64} />
        <ActivityIndicator color={colors.primary} />
        <T variant="small">Loading opportunities…</T>
      </View>
    ) : !result && error ? (
      <View style={{ alignItems: 'center', gap: space.lg, paddingVertical: space.xxl }}>
        <Image
          source={gameStageArt.explore}
          style={{ width: 96, height: 96 }}
          contentFit="contain"
          accessible={false}
        />
        <T>{error}</T>
        <Button title="Try again" variant="secondary" disabled={loading} onPress={refresh} />
      </View>
    ) : (
      <View style={{ alignItems: 'center', gap: space.lg, paddingVertical: space.xxl }}>
        <Image
          source={gameStageArt.explore}
          style={{ width: 96, height: 96 }}
          contentFit="contain"
          accessible={false}
        />
        <T variant="heading">No matches yet</T>
        <T style={{ textAlign: 'center', color: colors.textSecondary }}>
          Try another search or browse all opportunities.
        </T>
        <Button title="Clear filters" variant="secondary" onPress={clearFilters} />
      </View>
    );
  return (
    <Screen scroll={false} header={<PageHeader title="Compete" />}>
      <FlatList
        showsVerticalScrollIndicator={false}
        data={result?.items ?? []}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={{
          paddingHorizontal: space.page,
          paddingBottom: space.xxl,
          flexGrow: 1,
          width: '100%',
          maxWidth: 600,
          alignSelf: 'center',
        }}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
        refreshing={Boolean(result) && loading}
        onRefresh={refresh}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={7}
        removeClippedSubviews={false}
      />
    </Screen>
  );
}
