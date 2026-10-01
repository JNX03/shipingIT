import { lessons } from '@/data/curriculum';
export { LessonScreen as default } from '@/screens/lesson';
export function generateStaticParams() {
  return lessons.map((lesson) => ({ id: lesson.id }));
}
