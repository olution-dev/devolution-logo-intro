# @devolution/logo-intro

The Devolution logo intro: "dev(arrow)lution." turns into "olution.dev".

- `@devolution/logo-intro`: the web renderer (DOM + SVG).
- `@devolution/logo-intro/core`: the platform-free maths (`frame`, `progress`, timing, arrow geometry). Every renderer is built on it, so the motion stays the same on every platform.

## Install

```sh
bun add github:olution-dev/devolution-logo-intro#v1.0.1
```

To update, bump the tag.

## Use (web)

Your app loads the Quicksand font (weights 300 and 700). Pass any element that covers the screen:

```ts
import { playLogoIntro } from "@devolution/logo-intro";

const intro = playLogoIntro(document.getElementById("intro")!, {
  colors: { background: "#0a0a0a", text: "#f3f1ea", accent: "#f6da1e" },
  timing: { morph: 1600 },
  onFinish: () => startApp(),
});

await intro.finished; // the container has faded out and been removed
```

| Option          | Default                                          |
| --------------- | ------------------------------------------------ |
| `colors`        | `{ background: "#0a0a0a", text: "#f3f1ea", accent: "#f6da1e" }` (hex only) |
| `timing` (ms)   | `{ intro: 1200, hold: 400, morph: 2000, rest: 600, fade: 700 }` |
| `fontFamily`    | `"Quicksand", ui-rounded, system-ui, sans-serif` |
| `fontSize`      | `clamp(44px, 11vw, 150px)`                       |
| `fontTimeout`   | `1500`: if the font isn't ready by then, the intro is skipped |
| `skippable`     | `true`: pointer, key, wheel or touch input ends it |
| `reducedMotion` | the user's `prefers-reduced-motion` setting       |
| `onFinish`      | called once, when the fade-out starts             |

`skip()` ends it early. If anything goes wrong, the container is removed and `onFinish` still fires, so the page is never left covered.

Deciding when to play it (e.g. once per session) is up to the product.

## Develop

```sh
bun install
bun run type-check
bun run build   # writes dist/, which is committed so git installs need no build step
```
