import { voidifyAsync } from './common/async';
import { SettingsController } from './common/settings';
import { AsyncAbortController } from './content/asyncabortcontroller';
import { ControlPanel, createOrGetControlPanel } from './content/controlpanel';
import { createOrGetHighlight } from './content/highlight';
import { isTextNodeVisible } from './content/visibility';

import type { Browser } from 'webextension-polyfill';
import type { Settings } from './common/settings';

declare const browser: Browser;
declare const window: Window & {
  speedReaderInstance?: SpeedReader;
};

interface State {
  playbackState: 'running' | 'paused' | 'held';
  tickTimeoutId?: number;
  currentWordIndex: number;
}

interface Word {
  startTextNode: Node;
  rangeStartOffset: number;
  endTextNode: Node;
  rangeEndOffset: number;
  delay: 'regular' | 'short' | 'long';
}

const WORD_CHUNK_MATCHER = /((?:\S\.\s?)+|[^\s\\/\u2014]+)([\s\\/\u2014]|$)/dgu;
const LONG_DELAY_MATCHER = /[.:!?]\W*$/;
const SHORT_DELAY_MATCHER = /[,;\u2014\\/]\W*$/;
const NON_WHITESPACE_CHARACTER_MATCHER = /^\S$/;
const NON_WORD_MATCHER = /^\W+$/;
const WPM_DELTA = 10;

const DEFAULT_STATE: State = {
  playbackState: 'paused',
  currentWordIndex: NaN,
};

function noOpLogger() {
  /* no-op */
}

class SpeedReader {
  logger: typeof console.log = console.log;

  abortController: AsyncAbortController | null = null;
  words: Word[] = [];
  highlight: Highlight = createOrGetHighlight();
  range: Range = new Range();

  settings: Settings = SettingsController.DEFAULT_SETTINGS;
  state: State = DEFAULT_STATE;

  controlPanel: ControlPanel = createOrGetControlPanel();

  constructor() {
    browser.storage.sync.onChanged.addListener(
      voidifyAsync(async (changes) => {
        if ('settings' in changes && changes.settings.newValue) {
          this.logger('Settings changed:', changes);
          // Fetch settings from storage to get all values, since the settings do not store default values in storage.
          const settings = await SettingsController.get();
          this.updateSettings(settings);
        }
      }),
    );
  }

  async startSpeedReading(settings: Settings) {
    const selection = window.getSelection();
    if (selection?.anchorNode?.nodeType !== Node.TEXT_NODE) {
      this.controlPanel.showErrorMessage();
      return;
    }

    this.abortController = new AsyncAbortController();
    const { promise: abortedPromise, signal } = this.abortController;

    const currentWordIndex = this.prepareWordsList(selection);
    this.highlight.add(this.range);

    this.updateSettings(settings);
    this.state = { playbackState: 'running', currentWordIndex };

    window.addEventListener(
      'keydown',
      voidifyAsync(this.handleKeydown.bind(this)),
      { signal },
    );
    window.addEventListener('keyup', this.handleKeyup.bind(this), { signal });
    this.addControlPanelEventListeners(signal);

    this.controlPanel.showActionBar();
    this.tick();
    await abortedPromise;
  }

  close() {
    this.logger('Speed reading cancelled');
    this.controlPanel.close();

    this.highlight.clear();
    clearTimeout(this.state.tickTimeoutId);
    this.abortController?.abort();
    this.abortController = null;
  }

  updateSettings(settings: Settings) {
    this.logger = settings.verbose ? console.log : noOpLogger;
    this.logger('Updating settings:', settings);

    this.settings = settings;
    document.body.style.setProperty(
      '--speed-reader--highlight-color-background',
      settings.highlightBackgroundColor,
    );
    document.body.style.setProperty(
      '--speed-reader--highlight-color-text',
      settings.highlightTextColor,
    );
    this.controlPanel.setWordsPerMinute(settings.wordsPerMinute);
  }

  /**
   * Prepares a list of words to be highlighted for speed reading and determines the index of the word where the user's
   * selection starts.
   *
   * Each word in the returned list is represented by its containing text node and the start and end offsets within that
   * node.
   */
  private prepareWordsList(selection: Selection) {
    this.words.length = 0;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );

    let currentWordIndex = 0;
    while (walker.nextNode()) {
      if (walker.currentNode === selection.anchorNode) {
        currentWordIndex = this.words.length;
      }

      const { textContent } = walker.currentNode;
      if (!textContent) {
        continue;
      }

      if (!isTextNodeVisible(walker.currentNode)) {
        continue;
      }

      for (const match of textContent.matchAll(WORD_CHUNK_MATCHER)) {
        let [rangeStartOffset, rangeEndOffset] = match.indices?.[1] ?? [];
        let wordText = match[1] || '';
        const wordSeparatorCharacter = match[2] || '';
        if (
          rangeStartOffset === undefined ||
          rangeEndOffset === undefined ||
          !wordText.trim()
        ) {
          continue;
        }

        // For long words with hyphens, split them into smaller chunks at the hyphens.
        if (wordText.length > this.settings.hyphenatedWordLengthThreshold) {
          while (wordText.includes('-')) {
            const [wordTextStart, , ...wordTextRest] = wordText.split('-');

            this.words.push({
              startTextNode: walker.currentNode,
              rangeStartOffset,
              endTextNode: walker.currentNode,
              rangeEndOffset: rangeStartOffset + wordTextStart.length + 1,
              delay: 'regular',
            });

            wordText = wordTextRest.join('');
            rangeStartOffset += wordTextStart.length + 1;
          }
        }

        // If the separator is not a whitespace character, include it as part of the current word.
        if (NON_WHITESPACE_CHARACTER_MATCHER.test(wordSeparatorCharacter)) {
          wordText += wordSeparatorCharacter;
          rangeEndOffset += wordSeparatorCharacter.length;
        }

        // Determine the delay type based on punctuation.
        let delay: Word['delay'] = 'regular';
        if (LONG_DELAY_MATCHER.test(wordText)) {
          delay = 'long';
        } else if (SHORT_DELAY_MATCHER.test(wordText)) {
          delay = 'short';
        }

        // If the word consists solely of non-word characters (e.g., punctuation), merge it with the previous word and
        // assign it the same delay type, since such characters are typically read together with the preceding word.
        if (NON_WORD_MATCHER.test(wordText) && this.words.length > 0) {
          const previousWord = {
            ...this.words[this.words.length - 1],
            endTextNode: walker.currentNode,
            rangeEndOffset,
            delay,
          };
          this.words[this.words.length - 1] = previousWord;
          continue;
        }

        this.words.push({
          startTextNode: walker.currentNode,
          rangeStartOffset,
          endTextNode: walker.currentNode,
          rangeEndOffset,
          delay,
        });
      }
    }

    return currentWordIndex;
  }

  private addControlPanelEventListeners(signal: AbortSignal) {
    this.controlPanel.addEventListener(
      'open-settings',
      async () => {
        this.logger('Opening settings');
        this.pause();
        await browser.runtime.sendMessage({
          action: 'open-settings',
        } as MessageOpenSettings);
      },
      { signal },
    );
    this.controlPanel.addEventListener(
      'toggle-pause',
      () => {
        if (this.state.playbackState !== 'running') {
          this.resume();
        } else {
          this.pause();
        }
      },
      { signal },
    );
    this.controlPanel.addEventListener(
      'increase-wpm',
      async () => {
        await SettingsController.update({
          wordsPerMinute: this.settings.wordsPerMinute + WPM_DELTA,
        });
      },
      { signal },
    );
    this.controlPanel.addEventListener(
      'decrease-wpm',
      async () => {
        await SettingsController.update({
          wordsPerMinute: this.settings.wordsPerMinute - WPM_DELTA,
        });
      },
      { signal },
    );
    this.controlPanel.addEventListener(
      'close',
      () => {
        this.close();
      },
      { signal },
    );
    this.controlPanel.addEventListener(
      'start-hold',
      () => {
        this.hold();
      },
      { signal },
    );
    this.controlPanel.addEventListener(
      'release-hold',
      () => {
        if (this.state.playbackState === 'held') {
          this.resume();
        }
      },
      { signal },
    );
    this.controlPanel.addEventListener(
      'previous-word',
      () => {
        this.state.currentWordIndex--;
        this.tick();
      },
      { signal },
    );
    this.controlPanel.addEventListener(
      'next-word',
      () => {
        this.state.currentWordIndex++;
        this.tick();
      },
      { signal },
    );
  }

  private handleKeyup(event: KeyboardEvent) {
    if (event.key === 'Control' && this.state.playbackState === 'held') {
      this.resume();
    }
  }

  private async handleKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case ' ':
        event.preventDefault();
        if (this.state.playbackState !== 'running') {
          this.resume();
        } else {
          this.pause();
        }
        break;

      case 'Control':
        this.hold();
        break;

      case 'ArrowRight':
        event.preventDefault();
        this.state.currentWordIndex++;
        this.pause();
        this.tick();
        break;

      case 'ArrowLeft':
        event.preventDefault();
        this.state.currentWordIndex--;
        this.pause();
        this.tick();
        break;

      case 'ArrowUp':
        event.preventDefault();
        await SettingsController.update({
          wordsPerMinute: this.settings.wordsPerMinute + WPM_DELTA,
        });
        break;

      case 'ArrowDown':
        event.preventDefault();
        await SettingsController.update({
          wordsPerMinute: this.settings.wordsPerMinute - WPM_DELTA,
        });
        break;
    }
  }

  private pause() {
    if (this.state.playbackState === 'paused') {
      return;
    }
    this.logger('Speed reading paused');
    this.controlPanel.setPaused(true);
    this.state.playbackState = 'paused';
    clearTimeout(this.state.tickTimeoutId);
    this.state.tickTimeoutId = undefined;
  }

  private hold() {
    if (this.state.playbackState !== 'running') {
      return;
    }
    this.logger('Speed reading held');
    this.controlPanel.setPaused(true);
    this.state.playbackState = 'held';
    clearTimeout(this.state.tickTimeoutId);
    this.state.tickTimeoutId = undefined;
  }

  private resume() {
    if (this.state.playbackState === 'running') {
      return;
    }
    this.logger('Speed reading resumed');
    this.controlPanel.setPaused(false);
    this.state.playbackState = 'running';
    this.tick();
  }

  private tick() {
    this.state.currentWordIndex = Math.max(0, this.state.currentWordIndex);
    if (this.state.currentWordIndex >= this.words.length) {
      this.logger('Speed reading completed');
      this.pause();
      return;
    }

    const {
      startTextNode,
      rangeStartOffset,
      endTextNode,
      rangeEndOffset,
      delay,
    } = this.words[this.state.currentWordIndex];
    this.range.setStart(startTextNode, rangeStartOffset);
    this.range.setEnd(endTextNode, rangeEndOffset);
    this.scrollToRange();

    if (this.state.playbackState !== 'running') {
      return;
    }

    this.state.tickTimeoutId = setTimeout(
      () => {
        this.state.currentWordIndex++;
        this.tick();
      },
      (60_000 / this.settings.wordsPerMinute) * this.delayMultiplier(delay),
    );
  }

  private scrollToRange() {
    const { top: rangeTop, height: rangeHeight } =
      this.range.getBoundingClientRect();
    const top =
      rangeTop + rangeHeight / 2 + window.scrollY - window.innerHeight / 2;
    window.scrollTo({ top, behavior: 'instant' });

    const { top: lineHighlightTop, bottom: lineHighlightBottom } =
      this.range.getBoundingClientRect();
    this.controlPanel.setTopAndBottom(lineHighlightTop, lineHighlightBottom);
  }

  private delayMultiplier(delay: Word['delay']) {
    switch (delay) {
      case 'short':
        return this.settings.shortDelayMultiplier;
      case 'long':
        return this.settings.longDelayMultiplier;
      case 'regular':
      default:
        return 1.0;
    }
  }
}

void (async () => {
  window.speedReaderInstance?.close();

  const settings = await SettingsController.get();

  window.speedReaderInstance ??= new SpeedReader();
  await window.speedReaderInstance.startSpeedReading(settings);
})();
