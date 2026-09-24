# the reliquary

a tiny private keepsake site for two people. psx gothic look, plain html, css and js, no build step.

originally made for a partner and me, but we have parted ways since then. the concept still rocks, so feel free to take this and adapt it however you want if you wish to gift your significant other something unique ^^

this repo is the showcase version. the two people (MOTH and CROW) and everything they posted are made up, and there is no database, so anything you add only lives in your browser tab until you close it. the reset button at the top puts it all back.

## what it does

- board: the screen is split in half, one side each. you send each other little finds tagged as song, media, mythology, writing, art, lore or general, with text or a photo, and leave notes under each other's posts. tabs at the top filter by tag
- map: a shared wishlist of places. mark them as visited, pick one as home and the list sorts itself by distance. the map is also cut into ~100km hexagons you can click to mark where you have been (red and blue for each person, gold when you both have)
- vigil: two little figures. light up the part that needs attention from the other person (head is "talk to me", torso is affection, and so on) and write a note that burns out after 24 hours
- chronicle: albums for trips. photos get uploaded, videos are saved as links so they don't eat storage

## running it

open `index.html` in a browser, or serve the folder with anything, for example `python -m http.server`.

## making it real

for two phones to actually see each other's stuff you need somewhere to keep the data. the real version ran on supabase's free tier (postgres + storage + realtime). everything goes through the `store` object in `app.js`, so swapping it for database calls is the only real change. `data.js` holds the names, tags and what each body part means, change those to whatever fits you two.

built with [leaflet](https://leafletjs.com), [h3-js](https://github.com/uber/h3-js) and openstreetmap tiles. fonts are pirata one and vt323.
