# Muninn Motion System

Muninn uses one shared motion language for positive UI feedback. Copy, Save, Favorite, Bookmark, Rating, and future success interactions must reuse `MotionBurst` and its controller instead of defining feature-local particles, keyframes, or success timers.

## Choreography

A positive interaction follows one restrained sequence:

1. the default icon yields to its success icon;
2. the success icon scales through approximately `.88 → 1.12 → .97 → 1` over 330 milliseconds;
3. a radial geometric burst travels roughly 12–16 pixels and fades within about 360 milliseconds;
4. the success icon remains visible for about 1.2 seconds before returning softly to the default icon.

Motion communicates confirmation rather than celebration. Bursts remain compact, monochrome, and quiet, but their particles deliberately vary in scale and spacing. Each particle follows a shallow individual arc away from the control rather than a perfectly straight or symmetrical radius. Do not introduce colorful confetti, gravity, bouncing, large travel distances, or feature-specific choreography.

## Component API

```astro
<button data-motion-positive>
  <span data-motion-icon="default"><Icon name="copy" /></span>
  <span data-motion-icon="success"><Icon name="check" /></span>
  <MotionBurst variant="default" color="accent" />
</button>
```

Available variants:

- `default`: filled dots, hollow rings, and thin rays in the control's current accent color. Use for Copy, Save, and generic Success.
- `sparkle`: four-point glints, small dots, and thin rays in Muninn's favorite/rating yellow. Use for Favorite, Bookmark, and Rating.
- `sunray`: thin yellow rays distributed around the full 360-degree circumference. Use only when adding a regular vault note to favorites; Experience favorites retain the `sparkle` language.

The supported semantic colors are `accent` and `favorite`. `accent` inherits `currentColor`; the owning control therefore remains responsible for its theme color. `favorite` resolves to the shared warm yellow.

## Trigger Contract

Interaction code never manipulates particles or animation classes directly. After an operation has succeeded, dispatch a bubbling event from the motion host:

```ts
host.dispatchEvent(new CustomEvent("muninn:motion-positive", { bubbles: true }));
```

`MotionBurstClient` owns animation restart and the success-state timer. Repeated successful actions restart the choreography cleanly. Failed, destructive, neutral, or removal actions must not trigger a positive burst.

For markup generated as HTML strings, use `renderMotionBurstMarkup()` from `src/lib/motionBurst.ts`. Particle definitions remain shared with the Astro component.

## Accessibility

The burst is always `aria-hidden`; accessible feedback remains the responsibility of the control's label, state, or live region. Under `prefers-reduced-motion: reduce`, the icon may change state but pop and particle animation are disabled. Motion must never be required to understand whether an operation succeeded.

## Ownership

- `MotionBurst.astro` owns declarative particle markup.
- `src/lib/motionBurst.ts` owns particle geometry and generated-markup support.
- `MotionBurstClient.ts` owns triggering and timing.
- `src/styles/global.css` owns shared animation and shape presentation.
- Feature code owns only the semantic decision that an operation succeeded.

Changes to timing, travel, easing, particle geometry, or accessibility belong in this system and must apply consistently to all consumers.
