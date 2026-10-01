import type { Opportunity, OpportunityCategory, OpportunityQuery } from './contracts';
import { isRecord, textValue } from './validation';

const categories: [OpportunityCategory, RegExp][] = [
  ['hackathon', /hackathon|hack.?day|แฮกกาธอน|แฮคกาธอน/i],
  ['ai', /\bAI\b|artificial intelligence|machine learning|ปัญญาประดิษฐ์/i],
  ['coding', /coding|programming|software|robot|เขียนโปรแกรม|ซอฟต์แวร์|หุ่นยนต์/i],
  ['startup', /startup|start.up|accelerator|incubator|สตาร์ทอัพ|บ่มเพาะ/i],
  ['entrepreneurship', /business|entrepreneur|ธุรกิจ|ผู้ประกอบการ/i],
  ['research', /research|วิจัย|วิชาการ/i],
  ['design', /design|ออกแบบ/i],
  ['science', /science|scientific|วิทยาศาสตร์|วิศวกรรม/i],
  ['innovation', /innovation|innovator|technology|นวัตกรรม|เทคโนโลยี|สิ่งประดิษฐ์/i],
];
const cleanText = (value: unknown, max = 2000) =>
  textValue(value, max)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => cleanText(entry, 100))
        .slice(0, 30)
    : [];
// Generic prose and audience words are not evidence of a shared project topic.
const genericWords = new Set(
  `about after again all also and another any anyone are because been before being better between both build building built but can could did does doing each every everyone find first for from give good great had has have having help helps here how idea ideas into its just know like make making many may more most much must need needs next not now one only other our ours out own people per person problem problems project projects put really same say see she should show showing some someone something start started student students such than that the their them then there these they thing things think this those through time today too trying two use used user users uses very via want wants was way ways were what when where which while who why will with without work working works would yet you your yours`.split(
    ' ',
  ),
);
const shortTopics = new Set(['ai', 'ar', 'vr', 'ux']);
// Conservative phrase dictionary avoids unreliable whitespace segmentation of Thai.
// These are literal shared phrases, not translated matches or semantic confidence scores.
const thaiTopics = [
  'สิ่งแวดล้อม',
  'พลังงาน',
  'การศึกษา',
  'ห้องเรียน',
  'การบ้าน',
  'สุขภาพ',
  'การแพทย์',
  'ผู้พิการ',
  'ผู้สูงอายุ',
  'การเข้าถึง',
  'การเกษตร',
  'เกษตรกร',
  'อาหาร',
  'รีไซเคิล',
  'ขยะ',
  'มลพิษ',
  'คุณภาพน้ำ',
  'น้ำสะอาด',
  'โลกร้อน',
  'ปัญญาประดิษฐ์',
  'หุ่นยนต์',
  'ซอฟต์แวร์',
  'เขียนโปรแกรม',
  'ความปลอดภัย',
  'การเงิน',
  'การเดินทาง',
  'ขนส่ง',
  'ชุมชน',
  'ผู้ประกอบการ',
  'ธุรกิจ',
  'ออกแบบ',
  'วิทยาศาสตร์',
  'วิจัย',
];
const normalized = (value: string) => value.normalize('NFKC').toLowerCase();
function topicTerms(value: string): Set<string> {
  const text = normalized(value);
  const latin = (text.match(/[a-z][a-z0-9]*/g) ?? []).filter(
    (term) => (term.length >= 3 || shortTopics.has(term)) && !genericWords.has(term),
  );
  return new Set([...latin, ...thaiTopics.filter((term) => text.includes(term))]);
}
const provenanceReason = (category: OpportunityCategory) =>
  `Listed by DekPort in ${category}. Confirm age, team, and submission requirements on the event page.`;
export function categoryFor(text: string): OpportunityCategory | null {
  return categories.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}
export function deadlineStatus(deadline: string | null, now = Date.now()): Opportunity['status'] {
  if (!deadline || !Number.isFinite(Date.parse(deadline))) return 'unknown';
  return Date.parse(deadline) < now ? 'closed' : 'open';
}
export function mapOpportunity(raw: unknown, now = Date.now()): Opportunity | null {
  if (!isRecord(raw) || raw.status !== 'published' || raw.event_type !== 'competition') return null;
  const id = textValue(raw.id, 100);
  const title = cleanText(raw.title, 300);
  const slug = textValue(raw.slug, 300);
  if (!id || !title || !slug) return null;
  const tags = strings(raw.tags);
  const description = cleanText(raw.description);
  const category = categoryFor([title, description, cleanText(raw.category), ...tags].join(' '));
  if (!category) return null; // Unrelated art/sports contests are not described as innovation matches.
  const deadlineText = textValue(raw.registration_end, 80);
  const deadline = deadlineText && Number.isFinite(Date.parse(deadlineText)) ? deadlineText : null;
  const rawImage = textValue(raw.image_url, 1000);
  let imageUrl: string | null = null;
  try {
    const url = new URL(rawImage);
    if (
      url.protocol === 'https:' &&
      ['api.dekport.com', 'storage.dekport.com', 'dekport.com'].includes(url.hostname)
    )
      imageUrl = url.href;
  } catch {
    /* Optional illustration. */
  }
  return {
    id,
    title,
    description,
    category,
    organizer: cleanText(raw.organizer, 200) || 'See organizer details',
    location: cleanText(raw.location, 250) || cleanText(raw.province, 100) || 'Check event page',
    online: raw.is_online === true,
    deadline,
    status: deadlineStatus(deadline, now),
    eligibility: strings(raw.education_level),
    fee: typeof raw.fee === 'number' && Number.isFinite(raw.fee) && raw.fee >= 0 ? raw.fee : null,
    currency: textValue(raw.currency, 8) || 'THB',
    tags,
    url: `https://dekport.com/competition/${encodeURIComponent(slug)}`,
    imageUrl,
    matchReason: provenanceReason(category),
  };
}
export function filterOpportunities(
  items: Opportunity[],
  query: OpportunityQuery = {},
): Opportunity[] {
  const search = (query.query ?? '').trim().toLowerCase();
  const projectTerms = topicTerms(
    [query.project?.problem, query.project?.targetUser, query.project?.name]
      .filter(Boolean)
      .join(' '),
  );
  return items
    .filter(
      (item) =>
        (query.includeClosed || item.status !== 'closed') &&
        (!query.category || query.category === 'all' || query.category === item.category) &&
        (!search ||
          [item.title, item.description, item.organizer, ...item.tags]
            .join(' ')
            .toLowerCase()
            .includes(search)),
    )
    .map((item) => {
      const eventTerms = topicTerms([item.title, item.description, ...item.tags].join(' '));
      const matchingTerms = [...projectTerms].filter((term) => eventTerms.has(term));
      return {
        ...item,
        matchReason: matchingTerms.length
          ? `Shares terms with your project: ${matchingTerms.slice(0, 3).join(', ')}. Check eligibility with the organizer.`
          : provenanceReason(item.category),
        score: matchingTerms.length,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.status === 'closed' ? 1 : 0) - (b.status === 'closed' ? 1 : 0) ||
        (a.deadline ? Date.parse(a.deadline) : Infinity) -
          (b.deadline ? Date.parse(b.deadline) : Infinity),
    )
    .map(({ score: _score, ...item }) => item);
}
