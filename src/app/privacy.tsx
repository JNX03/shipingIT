import { Screen, PageHeader } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
export default function Privacy() {
  return (
    <Screen>
      <PageHeader title="Your ideas belong to you." back />
      <T variant="subheading">Saved on this device</T>
      <T>
        Your profile name, lesson and adventure progress, character chats, preferences, prototype,
        and project notebook are stored on this device. Export your game blueprint from My app and
        your notebook from Project Pack to keep copies. Uninstalling the app or clearing browser
        storage can remove this work.
      </T>
      <T variant="subheading">Sign-in and optional AI</T>
      <T>
        Sign-in is required to play. Supabase handles your account and session. Your saved game and
        notebook stay on this device; signing in does not create a cloud backup.
      </T>
      <T>
        Cloud mentor reviews send your question and selected project context when you enable cloud
        review and request it. Character questions include your recent chat with that character and
        prototype name. These requests go through ShipingIT’s Supabase server to OpenRouter and the
        selected model provider when available. Providers apply their own data policies. Keep
        private participant information out of interview notes.
      </T>
      <T>
        Character conversations are simulated practice. If the AI service is unavailable, prepared
        replies are labelled Offline practice. A failed online request may still have transmitted
        its context.
      </T>
      <T variant="subheading">Purchases and opportunities</T>
      <T>
        When purchases are configured, RevenueCat links your signed-in account ID with purchase and
        entitlement information. The Android Test Store QA preview uses test transactions without a
        real card charge. Production store transactions would be handled by your app store. The app
        does not store card details. Opportunity discovery requests public DekPort listings and may
        keep a dated local cache.
      </T>
      <T variant="subheading">Controls</T>
      <T>
        You can export your work, sign out, or reset your saved learning data in Settings. Reset
        clears the notebook, prototype, lessons and practice progress on this device. Keep an
        exported copy of any work you want to save.
      </T>
      <T>
        Resetting this device does not delete your sign-in account or purchase records. Supabase,
        RevenueCat and your app store handle account and purchase information under their own
        policies.
      </T>
    </Screen>
  );
}
