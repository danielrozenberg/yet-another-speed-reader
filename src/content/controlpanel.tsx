import { RefObject, ShadowRoot, h } from 'jsx-dom/min';

import closeSvg from '../../static/icons/close.svg';
import fasterSvg from '../../static/icons/faster.svg';
import pausedSvg from '../../static/icons/paused.svg';
import runningSvg from '../../static/icons/running.svg';
import settingsSvg from '../../static/icons/settings.svg';
import slowerSvg from '../../static/icons/slower.svg';
import innerCSS from '../../static/styles/controlpanel.inner.css';
import outerCSS from '../../static/styles/controlpanel.outer.css';
import { _ } from '../common/browser';
import { addTouchGestureListeners } from './touchgestures';

import type { PlaybackState } from './playbackstate';

declare const window: Window & {
  controlPanelInstance?: ControlPanel;
};

type ControlPanelEvents =
  | 'open-settings'
  | 'toggle-pause'
  | 'increase-wpm'
  | 'decrease-wpm'
  | 'close'
  | 'start-hold'
  | 'release-hold'
  | 'previous-word'
  | 'next-word';

export class ControlPanel extends EventTarget {
  #hostElement: HTMLDialogElement;
  #containerRef: RefObject<HTMLDivElement> = { current: null };
  #statusImageRef: RefObject<HTMLImageElement> = { current: null };
  #wordsPerMinuteRef: RefObject<HTMLSpanElement> = { current: null };

  constructor() {
    super();
    Object.setPrototypeOf(this, ControlPanel.prototype);

    this.#hostElement = document.body.appendChild(
      <dialog id="__speed-reader-control-panel">
        <div>
          <ShadowRoot mode="open">
            <style>{innerCSS}</style>
            <div class="wrapper">
              <div
                class="container"
                ref={this.#containerRef}
                data-state="action-bar"
              >
                <div class="section error-only">
                  {_('controlPanelNoSelectionErrorMessage')}
                </div>

                <div class="section action-bar-only">
                  <button
                    title={_('controlPanelButtonOpenSettings')}
                    type="button"
                    onClick={() => this.dispatchTypedEvent('open-settings')}
                  >
                    <span class="button-background">
                      <img src={settingsSvg} />
                    </span>
                  </button>
                </div>

                <div class="section action-bar-only">
                  <button
                    title={_('controlPanelButtonTogglePause')}
                    type="button"
                    onClick={() => this.dispatchTypedEvent('toggle-pause')}
                  >
                    <span class="button-background">
                      <img src={runningSvg} ref={this.#statusImageRef} />
                    </span>
                  </button>
                </div>

                <div class="section action-bar-only">
                  <button
                    title={_('controlPanelButtonIncreaseWPM')}
                    type="button"
                    onClick={() => this.dispatchTypedEvent('increase-wpm')}
                  >
                    <span class="button-background">
                      <img src={fasterSvg} />
                    </span>
                  </button>
                  <span
                    class="wordsPerMinute"
                    ref={this.#wordsPerMinuteRef}
                  ></span>
                  <button
                    title={_('controlPanelButtonDecreaseWPM')}
                    type="button"
                    onClick={() => this.dispatchTypedEvent('decrease-wpm')}
                  >
                    <span class="button-background">
                      <img src={slowerSvg} />
                    </span>
                  </button>
                </div>

                <div class="section always-show">
                  <button
                    title={_('controlPanelButtonClose')}
                    type="button"
                    onClick={() => this.#hostElement.close()}
                  >
                    <span class="button-background">
                      <img src={closeSvg} />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </ShadowRoot>
        </div>
      </dialog>,
    ) as HTMLDialogElement;

    this.#hostElement.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });

    addTouchGestureListeners(
      this.#hostElement,
      (gesture) => {
        switch (gesture) {
          case 'long-press':
            this.dispatchTypedEvent('start-hold');
            break;
          case 'release':
            this.dispatchTypedEvent('release-hold');
            break;
          case 'double-tap':
            this.dispatchTypedEvent('toggle-pause');
            break;
          case 'swipe-left':
            this.dispatchTypedEvent('previous-word');
            break;
          case 'swipe-right':
            this.dispatchTypedEvent('next-word');
            break;
        }
      },
      (event) => event.target === this.#hostElement,
    );

    this.#hostElement.addEventListener('close', () => {
      this.dispatchTypedEvent('close');
    });
  }

  override addEventListener(
    type: ControlPanelEvents,
    listener: (this: ControlPanel, ev: Event) => any,
    options?: boolean | AddEventListenerOptions,
  ): void;
  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void {
    super.addEventListener(
      type,
      listener as EventListenerOrEventListenerObject,
      options,
    );
  }

  override removeEventListener(
    type: ControlPanelEvents,
    listener: (this: ControlPanel, ev: Event) => any,
    options?: boolean | EventListenerOptions,
  ): void;
  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void {
    super.removeEventListener(
      type,
      listener as EventListenerOrEventListenerObject,
      options,
    );
  }

  dispatchTypedEvent(type: ControlPanelEvents): boolean {
    return super.dispatchEvent(new Event(type));
  }

  showActionBar() {
    this.#containerRef.current?.setAttribute('data-state', 'action-bar');
    this.#hostElement.showModal();
    this.setPlaybackState('running');
  }

  showErrorMessage() {
    this.#containerRef.current?.setAttribute('data-state', 'error');
    this.#hostElement.showModal();
  }

  setTopAndBottom(top: number, bottom: number) {
    this.#hostElement.style.setProperty('--range-top', `${top}px`);
    this.#hostElement.style.setProperty('--range-bottom', `${bottom}px`);
  }

  setPlaybackState(state: PlaybackState) {
    if (this.#statusImageRef.current) {
      this.#statusImageRef.current.src =
        state === 'paused' ? pausedSvg : runningSvg;
      this.#statusImageRef.current.classList.toggle('held', state === 'held');
    }
  }

  setWordsPerMinute(wpm: number) {
    if (this.#wordsPerMinuteRef.current) {
      this.#wordsPerMinuteRef.current.textContent = `${wpm.toFixed(0)}`;
    }
  }

  close() {
    this.#hostElement.close();
  }
}

export function createOrGetControlPanel() {
  if (window.controlPanelInstance) {
    return window.controlPanelInstance;
  }

  document.head.appendChild(<style>{outerCSS}</style>);

  window.controlPanelInstance = new ControlPanel();
  return window.controlPanelInstance;
}
