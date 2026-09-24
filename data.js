"use strict";

const USERS = [
  { id: "user1", name: "MOTH" },
  { id: "user2", name: "CROW" },
];

const TAGS = ["Song", "Media", "Mythology", "Writing", "Art", "Lore", "General"];

const PARTS = [
  { key: "head",  name: "THE MIND",   plea: "hear me: real conversation, listen, understand me" },
  { key: "torso", name: "THE HEART",  plea: "hold me: affection, closeness, intimacy" },
  { key: "arm_l", name: "THE HAND",   plea: "aid me: practical help, share the burdens" },
  { key: "arm_r", name: "THE SHIELD", plea: "steady me: reassurance that we are well" },
  { key: "leg_l", name: "THE FLESH",  plea: "touch me: hold me close, skin to skin" },
  { key: "leg_r", name: "THE PATH",   plea: "walk with me: go out, wander, adventure" },
];

function buildSeed() {
  const now = Date.now();
  const ago = (d, h = 0, m = 0) => new Date(now - ((d * 24 + h) * 60 + m) * 60000).toISOString();

  const posts = [
    { id: "p01", author: "user1", tag: "Mythology", created_at: ago(23, 4),
      body: "Veles lives down in the wet roots of the world tree and Perun keeps throwing lightning at him from the top branches. so every storm is technically a family argument https://en.wikipedia.org/wiki/Veles_(god)" },
    { id: "p02", author: "user2", tag: "Lore", created_at: ago(22, 9),
      body: "the chandelier at Sedlec uses every bone of the human body at least once. we are going. no arguments https://en.wikipedia.org/wiki/Sedlec_Ossuary" },
    { id: "p03", author: "user1", tag: "Song", created_at: ago(19, 2),
      body: "Dead Can Dance, The Host of Seraphim. headphones, dark room, no phone. then tell me what you saw" },
    { id: "p04", author: "user2", tag: "Mythology", created_at: ago(18, 6),
      body: "the banshee doesn't cause death, she just mourns it before it happens. which is kind of sweet? in a terrible way" },
    { id: "p05", author: "user1", tag: "Art", created_at: ago(15, 5), image_url: "img/art_chapel.png",
      body: "made a tiny chapel on my lunch break. the windows took longer than the whole building" },
    { id: "p06", author: "user2", tag: "Song", created_at: ago(14, 1),
      body: "Chelsea Wolfe, Feral Love. sounds like a thunderstorm walking toward you very slowly" },
    { id: "p07", author: "user1", tag: "Writing", created_at: ago(11, 7),
      body: "wrote this on the back of a receipt at the bus stop:\n\nthe moon is just the sun's old coat, left out in the cold.\n\nkeep or burn?" },
    { id: "p08", author: "user2", tag: "Art", created_at: ago(10, 3), image_url: "img/art_sea.png",
      body: "the sky over the river last night looked like a Beksinski painting so I tried to pixel it from memory https://en.wikipedia.org/wiki/Zdzis%C5%82aw_Beksi%C5%84ski" },
    { id: "p09", author: "user1", tag: "Media", created_at: ago(7, 8),
      body: "rewatched The Seventh Seal. the chess game on the beach still gets me every single time https://en.wikipedia.org/wiki/The_Seventh_Seal" },
    { id: "p10", author: "user2", tag: "Writing", created_at: ago(6, 4),
      body: "started a story about a bell ringer who can only speak in chimes. three pages in and she already has more drama than my whole family" },
    { id: "p11", author: "user1", tag: "Lore", created_at: ago(3, 10),
      body: "lighthouse keepers used to log every ship they saw, even the ones that never came close. I want a book like that for us" },
    { id: "p12", author: "user2", tag: "Media", created_at: ago(2, 5),
      body: "fell into a hole of old memento mori photography tonight. unsettling and weirdly tender https://en.wikipedia.org/wiki/Memento_mori" },
    { id: "p13", author: "user1", tag: "General", created_at: ago(0, 5),
      body: "we need to rank every soup we eat this winter. I'm dead serious. I already made the spreadsheet" },
    { id: "p14", author: "user2", tag: "General", created_at: ago(0, 0, 40),
      body: "reminder that you still owe me one (1) midnight walk. I am collecting" },
  ].map((p) => ({ image_url: null, ...p }));

  const notes = [
    { id: "n01", post_id: "p01", author: "user2", created_at: ago(23, 1), body: "so the rain is Veles crying after losing again?" },
    { id: "n02", post_id: "p01", author: "user1", created_at: ago(23, 0), body: "every single time. poor guy" },
    { id: "n03", post_id: "p02", author: "user1", created_at: ago(22, 6), body: "fine but I'm holding your hand the whole time" },
    { id: "n04", post_id: "p02", author: "user2", created_at: ago(22, 5), body: "deal" },
    { id: "n05", post_id: "p05", author: "user2", created_at: ago(15, 2), body: "the little yellow windows!! frame it" },
    { id: "n06", post_id: "p06", author: "user1", created_at: ago(13, 20), body: "on repeat since you sent it" },
    { id: "n07", post_id: "p07", author: "user2", created_at: ago(11, 5), body: "keep. obviously keep" },
    { id: "n08", post_id: "p07", author: "user1", created_at: ago(11, 4), body: "ok it lives" },
    { id: "n09", post_id: "p08", author: "user1", created_at: ago(10, 1), body: "this one goes on the fridge" },
    { id: "n10", post_id: "p10", author: "user1", created_at: ago(5, 22), body: "I need chapter two by friday" },
    { id: "n11", post_id: "p13", author: "user2", created_at: ago(0, 4), body: "the mushroom one from the market is already winning" },
    { id: "n12", post_id: "p14", author: "user1", created_at: ago(0, 0, 20), body: "tonight? bring the good scarf" },
  ];

  const pins = [
    ["pin01", "user1", "The Attic, Kraków",            50.0647, 19.9450, false, true,  60],
    ["pin02", "user2", "Sedlec Ossuary, Kutná Hora",   49.9619, 15.2883, true,  false, 58],
    ["pin03", "user1", "Wieliczka Salt Mine",          49.9833, 20.0550, true,  false, 57],
    ["pin04", "user2", "Bran Castle",                  45.5149, 25.3672, true,  false, 55],
    ["pin05", "user2", "Hill of Crosses",              56.0153, 23.4167, true,  false, 50],
    ["pin06", "user1", "Catacombs of Paris",           48.8339,  2.3324, true,  false, 48],
    ["pin07", "user2", "Hallstatt Bone House",         47.5622, 13.6493, false, false, 40],
    ["pin08", "user1", "Capuchin Crypt, Rome",         41.9043, 12.4888, false, false, 33],
    ["pin09", "user1", "Mont-Saint-Michel",            48.6361, -1.5115, false, false, 27],
    ["pin10", "user2", "Whitby Abbey",                 54.4885, -0.6081, false, false, 20],
    ["pin11", "user1", "Old Man of Storr, Skye",       57.5074, -6.1799, false, false, 12],
    ["pin12", "user2", "Meteora",                      39.7217, 21.6306, false, false, 4],
  ].map(([id, author, name, lat, lng, visited, is_home, d]) =>
    ({ id, author, name, lat, lng, visited, is_home, created_at: ago(d) }));

  const routes = [
    { who: ["user1", "user2"], ring: 1, path: [[50.06, 19.94]] },
    { who: ["user1", "user2"], path: [[50.06, 19.94], [49.82, 18.26], [49.59, 17.25], [49.95, 15.27], [50.08, 14.43]] },
    { who: ["user1", "user2"], path: [[50.06, 19.94], [48.72, 21.26], [47.53, 21.63], [46.77, 23.60], [45.65, 25.60], [45.51, 25.37]] },
    { who: ["user1", "user2"], path: [[50.06, 19.94], [52.23, 21.01], [53.13, 23.16], [54.90, 23.90], [55.93, 23.31], [56.02, 23.42]] },
    { who: ["user1", "user2"], path: [[48.85, 2.35]] },
    { who: ["user1"], path: [[52.23, 21.01], [52.52, 13.40], [53.55, 9.99]] },
    { who: ["user2"], path: [[49.82, 18.26], [48.21, 16.37], [47.50, 19.04]] },
    { who: ["user2"], path: [[46.05, 14.51]] },
  ];

  const hexes = [];
  if (typeof h3 !== "undefined") {
    const owners = new Map();
    const mark = (lat, lng, ring, who) => {
      const c = h3.latLngToCell(lat, lng, 3);
      (ring ? h3.gridDisk(c, ring) : [c]).forEach((cell) => {
        if (!owners.has(cell)) owners.set(cell, new Set());
        who.forEach((w) => owners.get(cell).add(w));
      });
    };
    routes.forEach(({ who, ring, path }) => {
      if (path.length === 1) mark(path[0][0], path[0][1], ring, who);
      for (let i = 0; i + 1 < path.length; i++) {
        const [a, b] = [path[i], path[i + 1]];
        const km = Math.hypot(b[0] - a[0], (b[1] - a[1]) * Math.cos((a[0] * Math.PI) / 180)) * 111;
        const steps = Math.max(1, Math.ceil(km / 20));
        for (let s = 0; s <= steps; s++) {
          mark(a[0] + ((b[0] - a[0]) * s) / steps, a[1] + ((b[1] - a[1]) * s) / steps, ring, who);
        }
      }
    });
    owners.forEach((set, cell) => set.forEach((author) => hexes.push({ h3: cell, author })));
  }

  const needs = {
    user1: {
      parts: ["head", "leg_r"],
      note: "my head has been loud all week. could we take the long way home on saturday and just talk? no plans",
      note_at: ago(0, 6),
    },
    user2: {
      parts: ["torso", "leg_l"],
      note: "nothing heavy. just want the blanket, the couch and you tonight",
      note_at: ago(0, 2),
    },
  };

  const trips = [
    { id: "t1", title: "The Bone Church Run", season: "OCT 2025", author: "user2", created_at: ago(330) },
    { id: "t2", title: "Salt & Candles",      season: "JAN 2026", author: "user1", created_at: ago(240) },
    { id: "t3", title: "Carpathian Wander",   season: "MAY 2026", author: "user1", created_at: ago(120) },
    { id: "t4", title: "Field of Crosses",    season: "AUG 2026", author: "user2", created_at: ago(40) },
  ];

  const mementos = [
    ["m01", "t1", "user2", "photo", "img/bones_arches.png", "every single one of them looking at us"],
    ["m02", "t1", "user1", "photo", "img/church_dusk.png", "the church outside, right before closing"],
    ["m03", "t1", "user2", "video", "img/vid_bones.png", "the chandelier, filmed badly"],
    ["m04", "t1", "user1", "photo", "img/night_road.png", "drive back at 2am with one working headlight"],
    ["m05", "t2", "user1", "photo", "img/salt_chamber.png", "a whole chapel carved out of salt, 100m down"],
    ["m06", "t2", "user2", "photo", "img/candles.png", "lit one for each of us"],
    ["m07", "t2", "user1", "photo", "img/snow_town.png", "old town on the walk back"],
    ["m08", "t3", "user2", "photo", "img/castle_hill.png", "the castle at dawn, worth the 5am alarm"],
    ["m09", "t3", "user1", "photo", "img/fog_pines.png", "fog so thick we lost the car for an hour"],
    ["m10", "t3", "user1", "video", "img/vid_castle.png", "night footage from the ridge"],
    ["m11", "t4", "user2", "photo", "img/crosses_sunset.png", "thousands of them, and the wind made them sing"],
    ["m12", "t4", "user1", "photo", "img/field_road.png", "the road there. flat forever"],
  ].map(([id, trip_id, author, kind, img, caption], i) => ({
    id, trip_id, author, kind, caption,
    url: kind === "photo" ? img : "#",
    thumb: kind === "video" ? img : null,
    created_at: ago(300 - i * 20),
  }));

  return { posts, notes, pins, hexes, needs, trips, mementos };
}
