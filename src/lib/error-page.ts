export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cholo Kheli — Page unavailable</title>
    <style>
      :root { color-scheme: light dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #dbe3e6;
        color: #142629;
      }
      main { max-width: 480px; text-align: center; }
      h1 { margin: 0 0 12px; font-size: clamp(2rem, 7vw, 4.5rem); line-height: .92; letter-spacing: 0; }
      p { margin: 0 0 24px; color: #4c6267; line-height: 1.6; }
      .actions { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
      a, button {
        min-height: 44px;
        border: 1px solid rgba(20, 38, 41, .18);
        border-radius: 999px;
        padding: 0 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font: inherit;
        font-weight: 700;
        text-decoration: none;
        cursor: pointer;
      }
      button { background: #143f46; color: #f6fbfb; }
      a { color: #143f46; background: rgba(255,255,255,.45); }
    </style>
  </head>
  <body>
    <main>
      <h1>This page couldn't load</h1>
      <p>We hit a temporary problem loading Cholo Kheli. Please refresh or return home.</p>
      <div class="actions">
        <button onclick="location.reload()">Refresh</button>
        <a href="/">Go home</a>
      </div>
    </main>
  </body>
</html>`;
}