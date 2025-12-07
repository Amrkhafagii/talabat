# Restaurant Icons – Mock Alignment

- Default set: keep Lucide for now, but render with stroke width ≈1.6 to match thinner mock strokes. Theme now exposes `theme.icons.strokeWidth` so shared UI wrappers can pass it to all icons.
- Sizes: use `theme.iconSizes.md` (20) for headers, `lg` (22) for bottom tabs, `sm` (18) for quick actions and list affordances.
- Swaps: if an icon feels off-model, swap to a custom SVG/asset while keeping the same size + stroke width; place overrides in a shared icon map to avoid per-screen drift.
- Color: inherit from `theme.colors.text`/`mutedText` for inactive states and `theme.colors.accent` for active states.
- Touch targets: wrap icons in 44px-tall hit areas; use `theme.tap.hitSlop` for small icon buttons.
