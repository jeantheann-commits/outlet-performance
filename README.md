# Outlet performance

A single-page dashboard (`index.html`) that reads the "Combined" tab of a Google Sheet and shows:

- KPI cards: total sales, % of target, orders, returns %
- An outlet filter (All plus one button per outlet)
- A bar per outlet-week showing sales as % of target, red below 90%, with a dashed 90% line
- A "Needs attention" list of outlet-weeks under 90% of target, worst first

No framework and no build step.

## Data source

The sheet link, tab name and threshold are in the `CONFIG` block at the top of the script in `index.html`:

```js
const CONFIG = {
  SHEET_URL: "https://docs.google.com/spreadsheets/d/<sheet id>/edit",
  TAB_NAME: "Combined",
  THRESHOLD: 0.9,
  CURRENCY_PREFIX: "",
};
```

The sheet must be a native Google Sheet (not an uploaded .xlsx) shared as "Anyone with the link can view". The tab needs these columns: `outlet, week, sales, target, orders, returns`.

The sheet's link is visible in the page source, so anyone who can open the dashboard can read the sheet. Do not put anything confidential in it.

## Run locally

Opening `index.html` by double-clicking does not work, because Google blocks data requests from local files. Serve it instead:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy to Vercel

1. In Vercel, choose Add New > Project and import this repository.
2. Leave Framework Preset as "Other". No build command or output directory is needed; `vercel.json` already sets them.
3. Click Deploy.

Every push to the main branch redeploys the site. The dashboard reads the sheet live, so data changes show up on reload without a redeploy.
