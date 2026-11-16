# MiniMuhsins app stories

This repository holds the story list for the MiniMuhsins app (iPhone, iPad and Android).
GitHub publishes `stories.json` to **https://minimuhsins.github.io/stories/stories.json** and the
app reads it when it opens and during an occasional background refresh. Changes reach families without an app store update.

Children see whatever is in this file, so be careful and always show Muneef the change before publishing it.

## Files

- `stories.json` is the story list the app reads. Edit only this file for normal updates.
- `allowed.json` lists the series and values the app knows. **Don't add to it.** A new series or value
  needs new artwork and labels in the app, which means an app update first.
- `scripts/validate.mjs` checks `stories.json`. GitHub runs it before publishing and refuses to publish if it fails.

## stories.json

```jsonc
{
  "schema": 1,                 // never change
  "updated": "2026-11-17",     // set to today's date whenever you edit
  "series": [                  // every series in allowed.json, in the order the app shows them
    { "slug": "little-village", "show": true },
    { "slug": "deeds", "show": false } // hidden: the series AND all its episodes disappear from the app
  ],
  "layout": { ... },           // how Home and Search look, see "Changing what the app shows"
  "featured": ["id", "id", "id"], // the hero cards under the heading on Home, in order (1–5, usually 3)
  "latest": ["id", ...],       // the "New stories" row and search order, newest first
  "episodes": [ { ...episode }, ... ]
}
```

An episode:

```jsonc
{
  "id": "XJPaCNhJ8PY",          // the 11-character YouTube video ID (from youtube.com/watch?v=XJPaCNhJ8PY or youtu.be/XJPaCNhJ8PY)
  "series": "zaynab",           // a slug from allowed.json
  "ep": 1,                      // episode number within the series, no gaps or repeats
  "title": "A Journey To Dreamland",
  "summary": "One or two sentences, what happens in the story.",
  "values": ["allah"],          // 1–4 values from allowed.json, most important first
  "guide": {
    "before": "Ask: a question to ask before watching?",
    "talk": ["Question about the story?", "Question about the lesson?", "Question about the child's own life?"],
    "activity": { "title": "Short name", "text": "A simple activity a parent can do at home in 5–10 minutes with things in the house." },
    "remember": "One short sentence the child can repeat, starting with I where it fits."
  },
  "release": "2026-12-01T17:00:00+13:00" // optional: a scheduled premiere
}
```

`review` and `thumb` are left over from the website and the app ignores them. Keep them where they already exist.

## Adding a new episode

1. Get the YouTube link, series and episode number. Ask for anything you can't work out. If the video is
   public, read its title and description to write the summary.
2. Add the episode to the end of `episodes`, written in the house style below.
3. Put its id at the **start** of `latest`.
4. If asked, put it in `featured` (the hero cards). Keep 3 hero cards unless Muneef says otherwise.
5. Set `updated` to today's date.
6. Run `node scripts/validate.mjs` and fix any problems.
7. Show Muneef the new entry and wait for his OK before you commit and push to `main`.
8. After pushing, check the publish worked: the "Publish stories" action on GitHub turns green, and
   `curl -s https://minimuhsins.github.io/stories/stories.json | grep <id>` finds the episode after a minute or two.

### Scheduled premieres and notifications

- If the video is scheduled on YouTube, set `release` to its premiere time **with the time zone**
  (New Zealand is `+13:00` in summer and `+12:00` in winter).
- Before that time the app shows the story as "coming soon" and it can't be played.
- Families who turned on new-story alerts get a notification at the release time. A phone only knows about
  an episode after it has refreshed the list, so **add scheduled episodes at least 1–2 days early.**
- An episode added with no `release` (or a past one) is playable straight away. Phones that find it during a
  background refresh also show a "new story" notification.

## House style

Read a few existing episodes in the same series first and match them.

- Written for parents of children aged 3–7: warm, short, simple words, British/NZ spelling (colour, favourite).
- Summary: 1–2 sentences, what happens. No spoilers beyond the lesson. No hype or emojis.
- `before`: starts with "Ask:".
- `talk`: 3 questions. One about what happened, one about the lesson, one about the child's own life.
- `activity`: safe for young children, no screens, no special supplies, no cooking with heat or sharp tools.
- `remember`: one short line a child can repeat.
- Islamic content: keep it gentle and accurate. Don't quote Qur'an verses or hadith unless Muneef gives you the exact
  wording and source. Use the phrases as the stories do (Bismillah, Alhamdulillah, InshaAllah, MashaAllah, SubhanAllah, salam).
- Arabic series titles and text stay in Arabic, written by Muneef. Don't translate or write Arabic yourself.

## Changing what the app shows

Everything below is in `stories.json` and reaches the app without a store update.

**Hero cards** (the big cards under "What story shall we watch?"): `featured`, 1–5 episode ids in order.

**Series row and which series exist in the app:** `series`. Order = order on Home. `"show": false` hides the series and
all its episodes everywhere (Home, Search, Stickers, Watch next). Keep hidden episodes in the file so they can come back by switching `show` to `true`.

**Home heading and sections:** `layout`.

```jsonc
"layout": {
  "heading": "What story shall we watch?",   // the line above the hero cards (max 40 characters)
  "sections": [                             // shown in this order under the hero cards (1–12)
    { "type": "series", "title": "Series" },                       // the series row
    { "type": "latest", "title": "New stories", "count": 8 },      // first `count` (1–20) from "latest"
    { "type": "list", "title": "Ramadan stories", "stories": ["id", "id"] }, // a row you pick by hand (1–20)
    { "type": "watchNext", "title": "Watch next" },                // each child's own next stories (automatic)
    { "type": "values", "title": "Stories about…", "values": ["kindness", "honesty"] } // value buttons
  ],
  "popular": ["id", ...],    // "Popular stories" in Search, in order (0–10)
  "searchValues": []         // value buttons in Search, in order; [] shows all
}
```

- Any section can have `"show": false` to hide it without deleting it.
- Titles: max 40 characters, same house style (short, warm, no emojis).
- Episodes in a hidden series can't be used in `featured`, `popular` or a `list` section (the check will say so).

## Other changes

- **Removing a story:** take it out of `episodes`, `latest` and `featured`. It disappears from the app on the next refresh.
- **Fixing a typo:** edit the text, update `updated`, validate, show the change, push.

## Never

- Never add videos that aren't from the MiniMuhsins YouTube channel.
- Never add links, web addresses or contact details to any text.
- Never change `schema`, `allowed.json` or the publish workflow without Muneef asking.
- Never push to `main` without running the check and getting Muneef's OK.
