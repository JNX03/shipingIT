import { Redirect } from 'expo-router';

/** Compatibility for old links; stories now belong to the normal Path. */
export default function StoryPreviewRedirect() {
  return <Redirect href="/(tabs)" />;
}
