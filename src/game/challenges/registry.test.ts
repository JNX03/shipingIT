import assert from 'node:assert/strict';
import test from 'node:test';
import { challengeCatalog } from './catalog';
import { applyChallengeAction, initialChallengeDraft } from './logic';
import { interviewQuestionIdeas, interviewQuestionIntent } from './registry';

const interviews = challengeCatalog.filter((challenge) => challenge.kind === 'interview');
const library = interviews.find((challenge) => challenge.id === 'explore-library-handoff')!;
const club = interviews.find((challenge) => challenge.id === 'explore-club-room')!;

test('every authored interview has one reliable question idea for each clue in item order', () => {
  assert.equal(interviews.length, 4);
  for (const challenge of interviews) {
    const ideas = interviewQuestionIdeas(challenge);
    assert.equal(ideas.length, challenge.items.length, challenge.id);
    let draft = initialChallengeDraft(challenge);
    for (const [index, question] of ideas.entries()) {
      draft = applyChallengeAction(challenge, draft, { type: 'ask', question });
      assert.equal(draft.dialogue.at(-1)?.clue, challenge.items[index].id, question);
      assert.equal(draft.dialogue.at(-1)?.reply, challenge.items[index].detail);
    }
  }
});

test('Library ownership and live-availability uncertainty request its authored open question', () => {
  for (const question of [
    'Who can keep the copy state current?',
    'Who is responsible for updating the catalog?',
    'Who can refresh a hold?',
    'What is still unknown about staff updating holds?',
    interviewQuestionIdeas(library)[2],
  ]) {
    assert.equal(
      interviewQuestionIntent(library, question.toLowerCase()),
      'handoff-question',
      question,
    );
  }
});

test('Club reminder preferences and reach request its authored open question', () => {
  for (const question of [
    'How many members silence notifications?',
    'Do members want alerts?',
    'Will a room-change notification reach everyone?',
    'What should we check about reminder preferences?',
    interviewQuestionIdeas(club)[2],
  ]) {
    assert.equal(
      interviewQuestionIntent(club, question.toLowerCase()),
      'reminder-question',
      question,
    );
  }
});

test('historical event framing keeps the first clue reachable despite availability or reminder words', () => {
  const cases = [
    {
      challenge: library,
      question:
        'What happened during my last visit when the catalog still showed live availability?',
      clue: 'catalog-claim',
    },
    {
      challenge: club,
      question: 'What happened last Tuesday when the room-change reminder could not reach members?',
      clue: 'room-change',
    },
  ];
  for (const { challenge, question, clue } of cases) {
    assert.equal(interviewQuestionIntent(challenge, question.toLowerCase()), undefined, question);
    const draft = applyChallengeAction(challenge, initialChallengeDraft(challenge), {
      type: 'ask',
      question,
      replyVersion: 2,
    });
    assert.equal(draft.dialogue.at(-1)?.clue, clue, question);
    assert.equal(draft.dialogue.at(-1)?.reply, challenge.items[0].detail);
  }
});

test('vague people questions, factual events, and unrelated topics receive no intent override', () => {
  for (const challenge of [library, club]) {
    for (const question of [
      'Who are the people?',
      'What happened last time?',
      'What happened after that?',
      'Who wants an app?',
      'Can everyone receive medical treatment?',
    ])
      assert.equal(interviewQuestionIntent(challenge, question), undefined, question);
  }
  for (const question of [
    'Who returned the copy yesterday?',
    'What did you check in the catalog yesterday?',
    'Who can keep the payment record current?',
    'Who told you to update the catalog yesterday?',
  ])
    assert.equal(interviewQuestionIntent(library, question), undefined, question);
  for (const question of [
    'What happened when the room changed?',
    'What happened when you received the alert?',
    'Who can keep the room current?',
    'Do members know which room was on the alert?',
  ])
    assert.equal(interviewQuestionIntent(club, question), undefined, question);
});

test('question registry does not route unrelated challenges or manufacture missing clues', () => {
  const nonInterview = challengeCatalog.find((challenge) => challenge.kind !== 'interview')!;
  assert.deepEqual(interviewQuestionIdeas(nonInterview), []);
  assert.equal(
    interviewQuestionIntent(nonInterview, 'Who can keep the copy state current?'),
    undefined,
  );
  assert.equal(
    interviewQuestionIntent(interviews[0], 'Who can keep the copy state current?'),
    undefined,
  );
  assert.equal(
    interviewQuestionIntent(
      { ...library, items: library.items.slice(0, 2) },
      'Who can keep the copy state current?',
    ),
    undefined,
  );
  assert.equal(
    interviewQuestionIntent(
      { ...club, items: club.items.slice(0, 2) },
      'Do members want reminders?',
    ),
    undefined,
  );
});
