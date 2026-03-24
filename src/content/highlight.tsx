import { h } from 'jsx-dom/min';

const HIGHLIGHT_NAME = 'speed-reader-highlight';
const HIGHLIGHT_STYLE = `
  ::highlight(${HIGHLIGHT_NAME}) {
    background: var(--speed-reader--highlight-color-background, yellow);
    color: var(--speed-reader--highlight-color-text, black);
  }`;

/**
 * Creates/retrieves a Highlight object and registers it with the CSS Highlight API, along with the necessary styles.
 */
export function createOrGetHighlight(): Highlight {
  let highlight = CSS.highlights.get(HIGHLIGHT_NAME);
  if (highlight) {
    return highlight;
  }

  highlight = new Highlight();
  CSS.highlights.set(HIGHLIGHT_NAME, highlight);

  document.head.appendChild(<style>{HIGHLIGHT_STYLE}</style>);

  return highlight;
}
