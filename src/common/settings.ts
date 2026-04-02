import type { Browser } from 'webextension-polyfill';

declare const browser: Browser;

export interface Settings {
  verbose: boolean;
  wordsPerMinute: number;
  highlightBackgroundColor: string;
  highlightTextColor: string;
  shortDelayMultiplier: number;
  longDelayMultiplier: number;
  hyphenatedWordLengthThreshold: number;
}

const DEFAULT_SETTINGS: Settings = {
  verbose: false,
  wordsPerMinute: 300,
  highlightBackgroundColor: '#ffff00',
  highlightTextColor: '#000000',
  shortDelayMultiplier: 1.5,
  longDelayMultiplier: 2.0,
  hyphenatedWordLengthThreshold: 16,
};

const MIN_WPM = 200;
const MAX_WPM = 600;

async function get(): Promise<Settings> {
  const { settings } = await browser.storage.sync.get({
    settings: DEFAULT_SETTINGS,
  });
  return { ...DEFAULT_SETTINGS, ...(settings as Settings) };
}

async function update(partialSettings: Partial<Settings>): Promise<void> {
  const fullSettings: Settings = { ...(await get()), ...partialSettings };

  // Ensure settings are within valid bounds.
  fullSettings.wordsPerMinute = Math.min(
    MAX_WPM,
    Math.max(MIN_WPM, fullSettings.wordsPerMinute),
  );
  fullSettings.shortDelayMultiplier = Math.min(
    fullSettings.shortDelayMultiplier,
    fullSettings.longDelayMultiplier,
  );
  fullSettings.longDelayMultiplier = Math.max(
    fullSettings.shortDelayMultiplier,
    fullSettings.longDelayMultiplier,
  );

  // Only store settings that differ from the defaults, so that updates to the extension will override changes to the
  // defaults but not settings changed by the user.
  const settings: Partial<Settings> = Object.fromEntries(
    Object.entries(fullSettings).filter(
      ([key, value]) => value != DEFAULT_SETTINGS[key as keyof Settings],
    ),
  );

  await browser.storage.sync.set({ settings });
}

export const SettingsController = Object.freeze({
  DEFAULT_SETTINGS,
  get,
  update,
});
