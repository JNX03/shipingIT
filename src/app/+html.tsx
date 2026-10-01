import { type PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

// Keep the web shell consistent with the explicitly light native app. Expo UI's
// web variables otherwise inherit the operating system's dark foreground color.
export default function RootHtml({ children }: PropsWithChildren) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" content="#2563EB" />
        <meta
          name="description"
          content="Explore a campus, find an insight, and build a playable app with Ami in ShipingIT."
        />
        <title>ShipingIT</title>
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
