# True Take-Home

UK take-home pay calculator. Live at https://truetakehome.co.uk/

Published by Appsiozo, a trading name of Saftainability Ltd.

## What is where

- `docs/` is the live website. GitHub Pages serves this folder. Do not edit it by hand.
- `src/` is the source: `body.html` (page and guides), `style.css`, `engine.js` (all tax rules), `app.js` (screen behaviour).
- `site.json` holds the site details: address, publisher, contact email, AdSense ID.
- `build.py` turns `src/` into `docs/`. It needs Python 3 and nothing else.

## Change something

1. Edit the file in `src/` or `site.json`.
2. Double-click `rebuild.bat`.
3. Double-click `publish.bat`. The live site updates in about a minute.

## Switch adverts on

1. Apply at adsense.google.com with the live address. Google gives you a publisher ID that starts `ca-pub-`.
2. Put it in `site.json` as `"adsense": "ca-pub-..."`, rebuild and publish. This adds the AdSense code to every page, writes `ads.txt`, and changes the privacy wording to cover adverts.
3. In AdSense, open Privacy and messaging and publish the European regulations message. UK visitors must be asked before personalised adverts are shown.
4. Once approved, create three display ad units in AdSense and put their slot numbers in `site.json` as `"slots": "111,222,333"`. The order is: under the result, below the calculator, after the guides. Rebuild and publish.

## Every April

1. Update the rates and thresholds in `src/engine.js` (the `YEARS` block at the top).
2. Update the year in the page title and description at the top of `build.py`.
3. Change `"checked"` in `site.json` to the date you checked them.
4. Rebuild and publish.

## Before relying on the figures

Have an accountant look over the results for a few real cases. The calculator does not cover the High Income Child Benefit Charge, tax codes other than the standard one, or benefits in kind.
