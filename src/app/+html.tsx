import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

/* =====================================================
   ROOT HTML SHELL
   Used for Expo Router static web export / PWA
===================================================== */

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ta">
      <head>
        <meta charSet="utf-8" />

        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        {/* PWA Theme */}
        <meta name="theme-color" content="#D71920" />

        {/* Android / Chrome PWA */}
        <meta name="mobile-web-app-capable" content="yes" />

        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />

        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />

        <meta name="apple-mobile-web-app-title" content="Tiruppur Smart City" />

        {/* SEO / App Description */}
        <meta
          name="description"
          content="Tiruppur Smart City - மக்கள் சேவை மற்றும் புகார் பதிவு செயலி"
        />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Website / PWA Icon */}
        <link rel="icon" href="/icon.png" />

        {/* iPhone / iPad Home Screen Icon */}
        <link rel="apple-touch-icon" href="/icon.png" />

        {/* Disable body scrolling on web so
            React Native ScrollView behaves properly */}
        <ScrollViewStyleReset />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              html,
              body {
                margin: 0;
                padding: 0;
                min-height: 100%;
                background: #F7F7F7;
              }

              body {
                overflow-x: hidden;
              }

              #root {
                min-height: 100vh;
              }
            `,
          }}
        />
      </head>

      <body>
        {children}

        {/* PWA Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ("serviceWorker" in navigator) {
                window.addEventListener("load", function () {
                  navigator.serviceWorker
                    .register("/sw.js")
                    .then(function (registration) {
                      console.log(
                        "✅ Tiruppur Smart City Service Worker registered:",
                        registration.scope
                      );
                    })
                    .catch(function (error) {
                      console.error(
                        "❌ Service Worker registration failed:",
                        error
                      );
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
