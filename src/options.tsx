import { h } from 'jsx-dom/min';

import { _ } from './common/browser';
import { SettingsController } from './common/settings';

import type { Browser } from 'webextension-polyfill';

declare const browser: Browser;

async function init() {
  const settings = await SettingsController.get();

  const shortMultiplierSpanElement = (
    <span>{settings.shortDelayMultiplier.toFixed(1)}×</span>
  ) as HTMLSpanElement;
  const longMultiplierSpanElement = (
    <span>{settings.longDelayMultiplier.toFixed(1)}×</span>
  ) as HTMLSpanElement;
  const hyphenatedWordLengthThresholdSpanElement = (
    <span>{settings.hyphenatedWordLengthThreshold}</span>
  ) as HTMLSpanElement;

  document.body.replaceWith(
    <body>
      <div class="panel-section panel-section-formElements">
        <h2>{_('optionsPageHighlightSettingsHeader')}</h2>

        <div class="panel-formElements-item">
          <label htmlFor="highlight-background-color">
            {_('optionsPageHighlightBackgroundColorLabel')}
          </label>
          <input
            id="highlight-background-color"
            type="color"
            value={settings.highlightBackgroundColor}
            onChange={async (event) => {
              const target = event.target as HTMLInputElement;
              await SettingsController.update({
                highlightBackgroundColor: target.value,
              });
            }}
          />
        </div>

        <div class="panel-formElements-item">
          <label htmlFor="highlight-text-color">
            {_('optionsPageHighlightTextColorLabel')}
          </label>
          <input
            id="highlight-text-color"
            type="color"
            value={settings.highlightTextColor}
            onChange={async (event) => {
              const target = event.target as HTMLInputElement;
              await SettingsController.update({
                highlightTextColor: target.value,
              });
            }}
          />
        </div>

        <div class="panel-formElements-item">
          <label htmlFor="highlight-color-reset">
            {_('optionsPageResetLabel')}
          </label>
          <button
            id="highlight-color-reset"
            type="button"
            onClick={async () => {
              await SettingsController.update({
                highlightBackgroundColor:
                  SettingsController.DEFAULT_SETTINGS.highlightBackgroundColor,
                highlightTextColor:
                  SettingsController.DEFAULT_SETTINGS.highlightTextColor,
              });
            }}
          >
            {_('optionsPageResetButton')}
          </button>
        </div>
      </div>

      <div class="panel-section panel-section-formElements">
        <h2>{_('optionsPageDelaySettingsHeader')}</h2>

        <div class="panel-formElements-item">
          <label htmlFor="short-delay-multiplier">
            {_('optionsPageShortDelayMultiplierLabel')}
          </label>
          <input
            id="short-delay-multiplier"
            type="range"
            step="0.1"
            min="1.0"
            max="3.0"
            value={settings.shortDelayMultiplier}
            onInput={(event) => {
              const target = event.target as HTMLInputElement;
              shortMultiplierSpanElement.textContent = `${parseFloat(
                target.value,
              ).toFixed(1)}×`;
            }}
            onChange={async (event) => {
              const target = event.target as HTMLInputElement;
              await SettingsController.update({
                shortDelayMultiplier: parseFloat(target.value),
              });
            }}
          />
          {shortMultiplierSpanElement}
        </div>

        <div class="panel-formElements-item">
          <label htmlFor="long-delay-multiplier">
            {_('optionsPageLongDelayMultiplierLabel')}
          </label>
          <input
            id="long-delay-multiplier"
            type="range"
            step="0.1"
            min="1.0"
            max="3.0"
            value={settings.longDelayMultiplier}
            onInput={(event) => {
              const target = event.target as HTMLInputElement;
              longMultiplierSpanElement.textContent = `${parseFloat(
                target.value,
              ).toFixed(1)}×`;
            }}
            onChange={async (event) => {
              const target = event.target as HTMLInputElement;
              await SettingsController.update({
                longDelayMultiplier: parseFloat(target.value),
              });
            }}
          />
          {longMultiplierSpanElement}
        </div>

        <div class="panel-formElements-item">
          <label htmlFor="hyphenated-word-length-threshold">
            {_('optionsPageHyphenatedWordLengthThresholdLabel')}
          </label>
          <input
            id="hyphenated-word-length-threshold"
            type="range"
            step="1"
            min="3"
            max="50"
            value={settings.hyphenatedWordLengthThreshold}
            onInput={(event) => {
              const target = event.target as HTMLInputElement;
              hyphenatedWordLengthThresholdSpanElement.textContent =
                target.value;
            }}
            onChange={async (event) => {
              const target = event.target as HTMLInputElement;
              await SettingsController.update({
                hyphenatedWordLengthThreshold: parseInt(target.value),
              });
            }}
          />
          <span>
            {hyphenatedWordLengthThresholdSpanElement}{' '}
            {_('optionsPageHyphenatedWordLengthThresholdUnits')}
          </span>
        </div>

        <div class="panel-formElements-item">
          <label htmlFor="delay-reset">{_('optionsPageResetLabel')}</label>
          <button
            id="delay-reset"
            type="button"
            onClick={async () => {
              await SettingsController.update({
                shortDelayMultiplier:
                  SettingsController.DEFAULT_SETTINGS.shortDelayMultiplier,
                longDelayMultiplier:
                  SettingsController.DEFAULT_SETTINGS.longDelayMultiplier,
                hyphenatedWordLengthThreshold:
                  SettingsController.DEFAULT_SETTINGS
                    .hyphenatedWordLengthThreshold,
              });
            }}
          >
            {_('optionsPageResetButton')}
          </button>
        </div>
      </div>
    </body>,
  );
}

browser.storage.sync.onChanged.addListener(init);

void init();
