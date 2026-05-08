export type TouchGestureEvent =
  | 'long-press'
  | 'release'
  | 'double-tap'
  | 'swipe-left'
  | 'swipe-right';

const SWIPE_THRESHOLD = 60;
const DOUBLE_TAP_THRESHOLD_MS = 350;

export function addTouchGestureListeners(
  element: HTMLElement,
  dispatch: (event: TouchGestureEvent) => void,
  filter: (event: TouchEvent) => boolean,
): void {
  let touchReferenceX = NaN;
  let lastTapTimestamp = NaN;

  element.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1 || !filter(event)) {
      return;
    }

    const now = Date.now();
    touchReferenceX = event.touches[0].clientX;
    if (lastTapTimestamp + DOUBLE_TAP_THRESHOLD_MS > now) {
      lastTapTimestamp = NaN;
      dispatch('double-tap');
    } else {
      lastTapTimestamp = now;
      dispatch('long-press');
    }
  });

  element.addEventListener(
    'touchmove',
    (event) => {
      if (isNaN(touchReferenceX) || !filter(event)) {
        return;
      }
      event.preventDefault();
      const delta = event.touches[0].clientX - touchReferenceX;
      if (delta > SWIPE_THRESHOLD) {
        touchReferenceX = event.touches[0].clientX;
        dispatch('swipe-right');
      } else if (delta < -SWIPE_THRESHOLD) {
        touchReferenceX = event.touches[0].clientX;
        dispatch('swipe-left');
      }
    },
    { passive: false },
  );

  const onTouchEnd = () => {
    touchReferenceX = NaN;
    dispatch('release');
  };
  element.addEventListener('touchend', onTouchEnd);
  element.addEventListener('touchcancel', onTouchEnd);
}
