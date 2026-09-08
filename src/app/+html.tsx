import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

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

        <meta name="theme-color" content="#D71920" />

        <meta name="mobile-web-app-capable" content="yes" />

        <meta name="apple-mobile-web-app-capable" content="yes" />

        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />

        <meta name="apple-mobile-web-app-title" content="Tiruppur Smart City" />

        <meta
          name="description"
          content="Tiruppur Smart City - மக்கள் சேவை மற்றும் புகார் பதிவு செயலி"
        />

        <link rel="manifest" href="/manifest.json" />

        <link rel="icon" href="/assets/images/favicon.png" />

        <link rel="apple-touch-icon" href="/assets/images/icon.png" />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              * {
                box-sizing: border-box;
              }

              html {
                width: 100%;
                min-height: 100%;
                margin: 0;
                padding: 0;
              }

              body {
                width: 100%;
                min-width: 320px;
                min-height: 100vh;
                margin: 0;
                padding: 0;
                overflow-x: hidden;
                background: #F7F7F7;
              }

              #root {
                width: 100%;
                min-width: 320px;
                min-height: 100vh;
              }
            `,
          }}
        />

        <ScrollViewStyleReset />
      </head>

      <body>
        {children}

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
