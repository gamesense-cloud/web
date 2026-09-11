# fonts

This directory is deliberately empty.

The forum is set in **Tahoma**, which is the face the original loaders use
(`ui.cpp` loads `C:\Windows\Fonts\tahoma.ttf`). Tahoma ships with Windows and
macOS, so on the machines this site is actually read on it is already there.

There is no good substitute on a webfont host — the near-misses all read as
"nearly Tahoma", which is worse than falling back. So the stack in
`src/frontend/styles/theme.css` does what the loader does and falls back
rather than loading something that is only approximately right:

```css
--ui: Tahoma, Verdana, "DejaVu Sans", Geneva, sans-serif;
```

`Verdana` covers macOS and most Linux desktops; `DejaVu Sans` covers the rest.

If you do want to self-host a face, drop the `.woff2` files in here and add a
`@font-face` block at the top of `theme.css`. Keep `font-display: swap` so a
slow font never blanks the page.
