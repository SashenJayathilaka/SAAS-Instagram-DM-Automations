/** Shared seconds for Framer Motion; Tailwind maps these to milliseconds. */
export const motionDuration = { fast: 0.14, base: 0.22, content: 0.36, section: 0.44 } as const;
export const motionEase = { out: [0.22, 1, 0.36, 1], inOut: [0.4, 0, 0.2, 1] } as const;
export const motionStagger = 0.055;

export function contentTransition(reduced: boolean | null = false) {
  return { duration: reduced ? 0 : motionDuration.base, ease: motionEase.out };
}

// Keep reading content in the initial DOM and visible even without hydration.
export function revealTransition(reduced: boolean | null = false, delay = 0) {
  return { duration: reduced ? 0 : motionDuration.section, ease: motionEase.out, delay: reduced ? 0 : delay };
}
