/**
 * Shared motion settings so every gesture in the app feels the same, modelled on iOS:
 * a critically damped spring that settles in about 0.4 s with no wobble, and a page that turns on a
 * light flick or a drag past a quarter of the screen.
 */
export const IOS_SPRING = { type: "spring", stiffness: 320, damping: 36, mass: 1 } as const;
/** Slightly softer spring for sheets and cards that move a long way. */
export const IOS_SHEET_SPRING = { type: "spring", stiffness: 260, damping: 32, mass: 1 } as const;
export const IOS_EASE = [0.32, 0.72, 0, 1] as const;
/** px/s that counts as a flick. */
export const FLICK_VELOCITY = 380;
/** Share of the width a drag must pass to turn the page without a flick. */
export const TURN_FRACTION = 0.25;
/** Movement before a touch is treated as a swipe rather than a tap or scroll (iOS uses about 10 pt). */
export const SWIPE_SLOP = 10;
