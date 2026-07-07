import type { Message } from '../types';

/**
 * Deterministic sample dataset so anyone landing on the site can try every
 * panel without uploading their own export. Generates a year-long, two-person
 * texting history (10,000+ messages) with realistic rhythm: bursty exchanges,
 * quiet weekdays, lively weekends, seasonal topics, and a handful of
 * conflict/repair beats so the pattern + sentiment panels have something to find.
 */

const NAME_A = 'Thing 1';
const NAME_B = 'Thing 2';

// Mulberry32 PRNG - deterministic so the demo dataset (and any screenshots
// of it) look the same for every visitor and every reload.
function mulberry32(seed: number) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;

function pick<T>(rng: Rand, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function chance(rng: Rand, p: number): boolean {
  return rng() < p;
}

function randInt(rng: Rand, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/** Sprinkle an emoji onto the end of a line some of the time, for texture. */
function withEmoji(rng: Rand, text: string, pool: readonly string[], p = 0.3): string {
  return chance(rng, p) ? `${text} ${pick(rng, pool)}` : text;
}

// ---------------------------------------------------------------------------
// Word banks
// ---------------------------------------------------------------------------

const EMOJI_POS = ['😂', '❤️', '🥹', '😭', '🔥', '✨', '👀', '💀', '🙏', '😊', '🥳', '😍', '🫶'];
const EMOJI_MILD_NEG = ['😩', '😭', '🙄', '😒', '😮‍💨'];
const LAUGH = ['lol', 'lmao', 'lmaooo', 'hahaha', 'dead 💀', 'im crying', 'not you being real for this'];

const ACTIVITIES = [
  'grab boba', 'get ramen', 'watch the game', 'go hiking', 'see a movie', 'go thrifting',
  'hit the gym', 'go on a run', 'try that new taco spot', 'go to the farmers market',
  'binge the new season', 'go bowling', 'check out the art fair', 'go apple picking',
  'hit up the beach', 'go to trivia night', 'get brunch', 'go to that concert',
  'road trip up the coast', 'go to the pumpkin patch', 'see the fireworks', 'go ice skating',
  'get coffee', 'study at the library', 'go to the farmers market', 'try that new ramen place',
];

const FOODS = [
  'ramen', 'tacos', 'pho', 'that new pizza place', 'sushi', 'dumplings', 'pad thai',
  'a burrito the size of my arm', 'those garlic noodles', 'boba', 'that brunch spot',
  'homemade pasta', 'birria tacos', 'a burger', 'hot pot',
];

const SHOWS = [
  'that new show everyone keeps talking about', 'the finale', 'the show we started last month',
  'that documentary', 'the new season', 'that movie everyone recommended', 'the new episode',
  'that video game everyone is playing', 'the new album', 'that podcast episode',
];

const FEELINGS_NEG = [
  'exhausted', 'stressed', 'overwhelmed', 'anxious', 'burnt out', 'frustrated', 'annoyed',
  'sad', 'off today', 'kind of down', 'so tired', 'drained', 'on edge',
];

const FEELINGS_POS = [
  'amazing', 'so relieved', 'really proud', 'so happy', 'excited', 'pumped', 'grateful',
  'on top of the world', 'really good', 'so much lighter', 'proud of myself honestly',
];

const WORK_TOPICS = [
  'this project at work', 'my thesis', 'the group project', 'finals', 'my boss',
  'this client', 'my manager', 'the deadline', 'my internship', 'the presentation tomorrow',
  'my capstone', 'this performance review', 'the new hire', 'my inbox',
];

const FAMILY = ['mom', 'dad', 'my sister', 'my brother', 'grandma', 'my cousin', 'my aunt', 'my uncle'];

const LIFE_TOPICS = [
  'whether I actually want to stay in this city', 'if I made the right call leaving that job',
  'what I actually want out of the next few years', 'why I keep comparing myself to everyone',
  'whether I should go back to school', 'how weird it is that we\'re actually adults now',
  'what I want to be doing five years from now', 'whether I\'m being too hard on myself',
];

// ---------------------------------------------------------------------------
// Scenario line
// ---------------------------------------------------------------------------

interface Line {
  who: 0 | 1;
  text: string;
}

function l(who: 0 | 1, text: string): Line {
  return { who, text };
}

type Scenario = (rng: Rand, ctx: { month: number; isWeekend: boolean }) => Line[];

const morningCheckIn: Scenario = (rng) => {
  const lines: Line[] = [
    l(0, withEmoji(rng, pick(rng, ['morning!', 'good morning', 'heyyy you up', 'gm', "morning, sleep okay?"]), EMOJI_POS, 0.25)),
    l(1, withEmoji(rng, pick(rng, ['morning', 'barely lol', 'yeah finally slept well', 'ugh not enough', "morninggg"]), EMOJI_POS, 0.25)),
  ];
  if (chance(rng, 0.5)) lines.push(l(0, pick(rng, ['what are you up to today', 'any plans today?', 'coffee already in hand'])));
  if (chance(rng, 0.5)) lines.push(l(1, pick(rng, ['not much honestly', 'just work then probably nothing', 'gonna try to be productive for once'])));
  return lines;
};

const planLogistics: Scenario = (rng) => {
  const activity = pick(rng, ACTIVITIES);
  const day = pick(rng, ['tonight', 'tomorrow', 'this weekend', 'friday', 'saturday', 'sunday', 'later']);
  const time = pick(rng, ['7', '7:30', '8', '6', '6:30', 'noon', '2']);
  const lines: Line[] = [
    l(0, `wanna ${activity} ${day}?`),
    l(1, pick(rng, ['yes!! im in', 'omg yes', 'depends what time', 'maybe, what time', 'im down'])),
  ];
  lines.push(l(0, `${time} work?`));
  lines.push(l(1, pick(rng, ['perfect', 'works for me', "yeah that's fine", 'can we do a bit later', 'see you then'])));
  if (chance(rng, 0.3)) {
    lines.push(l(0, pick(rng, ['should I book it or just walk in', "I'll figure out where exactly", "i'll text you the address"])));
    lines.push(l(1, pick(rng, ['sounds good', 'ok!', 'perfect, cant wait'])));
  }
  return lines;
};

const workVent: Scenario = (rng) => {
  const topic = pick(rng, WORK_TOPICS);
  const feeling = pick(rng, FEELINGS_NEG);
  const lines: Line[] = [
    l(0, `i am so ${feeling} because of ${topic}`),
    l(0, pick(rng, ['like genuinely done', 'i cannot with this today', "it's been non stop all week", 'i need a break so bad'])),
    l(1, pick(rng, ['im so sorry, that sounds rough', 'ugh that\'s so frustrating', 'okay that is a lot, im sorry', 'that makes total sense honestly'])),
  ];
  if (chance(rng, 0.6)) {
    lines.push(l(1, pick(rng, ['do you want to vent or want advice', 'what happened exactly', 'is there anything I can do'])));
    lines.push(l(0, withEmoji(rng, pick(rng, ['just needed to vent honestly', 'idk i just needed to say it somewhere', 'mostly just tired of it', 'kind of both tbh']), EMOJI_MILD_NEG, 0.3)));
    lines.push(l(1, pick(rng, ['im here for it, vent away', 'that is so valid', 'you are allowed to be upset about this', 'well im proud of you for pushing through it'])));
  }
  return lines;
};

const meme: Scenario = (rng) => {
  const lines: Line[] = [
    l(0, pick(rng, ['okay this is so funny', 'wait you need to see this', 'sending you something unhinged', 'i cannot stop thinking about this'])),
    l(1, pick(rng, ['send it', 'omg what', 'im scared', 'ok go on'])),
    l(0, withEmoji(rng, pick(rng, [pick(rng, LAUGH), 'i cant', 'this is so stupid but so good', 'why is this so accurate']), EMOJI_POS, 0.4)),
    l(1, withEmoji(rng, pick(rng, [pick(rng, LAUGH), 'STOP', 'i am screaming', 'why is this so real', 'okay this is actually so funny']), EMOJI_POS, 0.4)),
  ];
  return lines;
};

const goodDayShare: Scenario = (rng) => {
  const feeling = pick(rng, FEELINGS_POS);
  const lines: Line[] = [
    l(0, withEmoji(rng, `feeling ${feeling} today, not even sure why`, EMOJI_POS, 0.4)),
    l(1, pick(rng, ['okay i love that, what happened', 'yesss that energy', 'wait i needed to hear that today'])),
    l(0, pick(rng, ['honestly just a good day', 'small things went right and it added up', 'i think i just needed a win'])),
    l(1, withEmoji(rng, pick(rng, ['im so happy for you', 'keep that feeling, you deserve it', 'proud of you, seriously']), EMOJI_POS, 0.35)),
  ];
  return lines;
};

const foodTalk: Scenario = (rng) => {
  const food = pick(rng, FOODS);
  const lines: Line[] = [
    l(0, pick(rng, [`craving ${food} so bad right now`, `i really want ${food} today`, `should we get ${food} later`])),
    l(1, pick(rng, ['omg yes let\'s do that', 'i could go for that honestly', 'say less', 'wait i was just thinking about that too'])),
  ];
  if (chance(rng, 0.5)) {
    lines.push(l(0, pick(rng, ['same place as last time?', 'wanna try somewhere new', 'i can pick it up on the way'])));
    lines.push(l(1, pick(rng, ['yes that place was so good', 'sure lets try somewhere new', 'youre the best, thank you'])));
  }
  return lines;
};

const showsGames: Scenario = (rng) => {
  const show = pick(rng, SHOWS);
  const lines: Line[] = [
    l(0, `okay i finally started ${show}`),
    l(1, pick(rng, ['FINALLY', 'okay and??', 'wait no spoilers', 'yesss what do you think so far'])),
    l(0, pick(rng, ['it is actually so good', "i'm obsessed already", 'i have thoughts', "no because it's insane"])),
  ];
  if (chance(rng, 0.5)) {
    lines.push(l(1, pick(rng, ['okay i need to rewatch it with you', 'we need to talk about this in person', 'i have so many thoughts too'])));
    lines.push(l(0, pick(rng, ['yes okay movie night soon', 'for real, this weekend?', 'i am so down for that'])));
  }
  return lines;
};

const weekendRecap: Scenario = (rng) => {
  const activity = pick(rng, ACTIVITIES);
  const lines: Line[] = [
    l(0, pick(rng, ['how was your weekend', 'what did you end up doing', 'did you do anything fun'])),
    l(1, pick(rng, [`pretty good, ended up doing ${activity.replace(/^go /, '')}`, 'honestly pretty chill, just recharged', `we ended up going to ${activity}`, 'kind of a lazy one but I needed it'])),
    l(0, pick(rng, ['that sounds so nice', 'okay i love that for you', 'we should do that together sometime'])),
  ];
  return lines;
};

const travelPlanning: Scenario = (rng) => {
  const place = pick(rng, ['the coast', 'that cabin', 'the mountains', 'the city', 'that little town', 'somewhere with a beach']);
  const lines: Line[] = [
    l(0, `ok hear me out, what if we planned a trip to ${place}`),
    l(1, pick(rng, ['okay i am immediately interested', 'wait yes please', 'i have been wanting to get away so bad'])),
    l(0, pick(rng, ['i started looking at dates', "let's actually commit this time", 'we say this every year lol but i mean it'])),
    l(1, pick(rng, ["okay let's actually do it", 'im putting it in my calendar right now', 'yes, no take backs this time'])),
  ];
  return lines;
};

const familyUpdate: Scenario = (rng) => {
  const person = pick(rng, FAMILY);
  const lines: Line[] = [
    l(0, pick(rng, [`talked to ${person} today`, `${person} called me earlier`, `${person} is visiting next week`])),
    l(1, pick(rng, ['oh how did that go', 'aw how are they doing', 'that\'s exciting, how long are they staying'])),
    l(0, pick(rng, ['it was actually really nice', 'a lot, honestly, but good', 'good! a little chaotic but good', 'better than expected'])),
  ];
  return lines;
};

const healthFitness: Scenario = (rng) => {
  const lines: Line[] = [
    l(0, pick(rng, ['went on a run this morning', 'finally went back to the gym', 'tried a new workout class today', 'my body is so sore'])),
    l(1, pick(rng, ['look at you!!', 'proud of you honestly', 'okay i need to get back into that too', 'wait how was it']))
  ];
  if (chance(rng, 0.5)) {
    lines.push(l(0, pick(rng, ['it felt really good actually', 'i was dying the whole time but good', 'slow start but im getting there'])));
    lines.push(l(1, pick(rng, ['that\'s all that matters', 'one step at a time', 'we should go together sometime'])));
  }
  return lines;
};

const deepTalk: Scenario = (rng) => {
  const topic = pick(rng, LIFE_TOPICS);
  const lines: Line[] = [
    l(0, `can i be real with you for a sec`),
    l(1, pick(rng, ['always, whats up', 'of course, im listening', 'yeah whats going on'])),
    l(0, `i've been thinking a lot about ${topic}`),
    l(1, pick(rng, ['okay tell me everything', 'that makes sense, keep going', 'i feel like i think about that too honestly'])),
    l(0, pick(rng, ['i just dont know what im doing sometimes', 'i think im scared of getting it wrong', 'i feel like everyone else has it figured out and i dont'])),
    l(1, pick(rng, [
      'you are allowed to not have it figured out, nobody actually does',
      'i hear you, that makes a lot of sense and i dont think youre behind at all',
      'for what its worth i think you are doing so much better than you think',
      'that is such a real thing to feel, thank you for telling me',
    ])),
    l(0, pick(rng, ['thank you for listening to me ramble', 'okay that actually helps a lot', 'i needed to hear that honestly'])),
  ];
  return lines;
};

const supportValidation: Scenario = (rng) => {
  const feeling = pick(rng, FEELINGS_NEG);
  const lines: Line[] = [
    l(0, `feeling really ${feeling} today and i dont totally know why`),
    l(1, 'that\'s okay, you don\'t need a reason'),
    l(1, pick(rng, ['do you want company or space', 'im here either way', 'whatever you need, im around'])),
    l(0, pick(rng, ['just needed someone to know', 'company would be nice honestly', 'just needed to say it out loud'])),
    l(1, pick(rng, ['im really glad you told me', 'i am proud of you for saying that', 'that makes complete sense, you are not overreacting'])),
  ];
  return lines;
};

const conflictThenRepair: Scenario = (rng) => {
  const topic = pick(rng, ['the plans falling through again', 'you being late again', 'the thing you said earlier', 'you canceling last minute', 'you not texting back all day']);
  const lines: Line[] = [
    l(0, `can we talk about ${topic}`),
    l(1, pick(rng, ["I said I was sorry, what more do you want", "here we go again", "i didnt even do anything wrong though"])),
    l(0, pick(rng, ["you always do this and just brush it off", "it happens literally every time though", "you never actually listen when i bring this up"])),
    l(1, pick(rng, ["well maybe if you didnt make it into a whole thing every time", "i have a lot going on too you know", "im not the only one who does stuff like this"])),
    l(0, pick(rng, ['i just feel like it doesnt matter to you', 'i just want to feel heard honestly', 'im not trying to attack you, i just felt hurt'])),
  ];
  // give it a beat, then walk it back toward repair
  lines.push(l(1, pick(rng, [
    'okay, im sorry, that came out wrong',
    'you\'re right, i shouldnt have snapped like that',
    'im sorry, i hear you, i didnt mean to make you feel unheard',
  ])));
  lines.push(l(0, pick(rng, ['thank you for saying that', 'i appreciate you hearing me out', 'okay, that means a lot actually'])));
  lines.push(l(1, pick(rng, ['i really dont want to fight about this', 'can we start over', 'i love you and i dont want this to turn into something bigger'])));
  lines.push(l(0, pick(rng, ['yeah, me neither', 'okay, lets start over', 'i love you too, im sorry too'])));
  return lines;
};

const celebration: Scenario = (rng, ctx) => {
  const reason = ctx.month === 11
    ? pick(rng, ['thanksgiving', 'the holidays coming up'])
    : ctx.month === 0
      ? pick(rng, ['the new year', 'starting the year off right'])
      : pick(rng, ['finishing the project', 'the good news', 'passing the exam', 'the promotion', 'getting the offer', 'finally finishing that thing']);
  const lines: Line[] = [
    l(0, `okay i have to tell you something exciting about ${reason}`),
    l(1, pick(rng, ['WAIT TELL ME', 'okay im listening!!', 'omg go on'])),
    l(0, withEmoji(rng, pick(rng, ['it actually happened!!', 'we did it!!', 'it finally came through']), EMOJI_POS, 0.5)),
    l(1, withEmoji(rng, pick(rng, ['I AM SO PROUD OF YOU', 'okay this deserves a celebration', 'i am so happy for you, seriously', 'YESSS congrats congrats congrats']), EMOJI_POS, 0.5)),
    l(0, pick(rng, ['thank you thank you thank you', 'i couldnt have done it without you honestly', 'i had to tell you first'])),
  ];
  return lines;
};

const lateNightTalk: Scenario = (rng) => {
  const lines: Line[] = [
    l(0, pick(rng, ['you up?', 'cant sleep', 'still awake?'])),
    l(1, pick(rng, ['yeah cant sleep either', 'unfortunately yes', 'wide awake for no reason'])),
    l(0, pick(rng, ['same, my brain wont shut off', 'been laying here thinking about random stuff', 'insomnia is undefeated apparently'])),
    l(1, pick(rng, ['what are you thinking about', 'okay same honestly', 'lets just talk then'])),
  ];
  if (chance(rng, 0.5)) {
    lines.push(l(0, pick(rng, ['just life stuff honestly', 'nothing important, just thinking too much', 'random memories for some reason'])));
    lines.push(l(1, pick(rng, ['i get that', 'thats fair, my brain does that too', 'okay well im here if you want to talk it out'])));
  }
  return lines;
};

const insideJoke: Scenario = (rng) => {
  const lines: Line[] = [
    l(0, pick(rng, ['remember the raccoon incident', 'okay remember when we got kicked out of that place', 'thinking about the time you fell in front of everyone'])),
    l(1, pick(rng, ['DO NOT bring that up', 'im deceased', 'i will never live that down will i', 'stop i was just thinking about that too'])),
    l(0, pick(rng, [pick(rng, LAUGH), 'never. i will bring it up forever', 'iconic honestly'])),
  ];
  return lines;
};

const newsReaction: Scenario = (rng) => {
  const lines: Line[] = [
    l(0, pick(rng, ['did you see that video going around', 'okay did you see the news today', 'this story is so wild'])),
    l(1, pick(rng, ['no what happened', 'okay send it to me', 'wait what'])),
    l(0, pick(rng, ['its genuinely unbelievable', 'i had to read it twice', 'im still thinking about it honestly'])),
    l(1, pick(rng, ['okay im going to go look this up', 'wild, thanks for the warning', 'the internet is so unwell'])),
  ];
  return lines;
};

const goodNight: Scenario = (rng) => {
  const lines: Line[] = [
    l(0, pick(rng, ['okay im gonna pass out', 'heading to bed, long day tomorrow', 'goodnight, love you'])),
    l(1, pick(rng, ['night! love you', 'sleep well 💤', 'goodnight, talk tomorrow', 'night night'])),
  ];
  return lines;
};

// ---------------------------------------------------------------------------
// Scenario selection weights
// ---------------------------------------------------------------------------

interface WeightedScenario {
  scenario: Scenario;
  weight: number;
  hours: readonly number[];
  months?: readonly number[]; // restrict to certain months (0-11) if present
}

const SCENARIOS: WeightedScenario[] = [
  { scenario: morningCheckIn, weight: 8, hours: [7, 8, 9, 10] },
  { scenario: planLogistics, weight: 10, hours: [11, 12, 13, 17, 18, 19, 20] },
  { scenario: workVent, weight: 8, hours: [12, 13, 17, 18, 19, 20, 21] },
  { scenario: meme, weight: 12, hours: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22] },
  { scenario: foodTalk, weight: 8, hours: [11, 12, 17, 18, 19] },
  { scenario: showsGames, weight: 7, hours: [19, 20, 21, 22] },
  { scenario: weekendRecap, weight: 5, hours: [10, 11, 18, 19] },
  { scenario: travelPlanning, weight: 3, hours: [18, 19, 20, 21], months: [3, 4, 5, 6, 7, 11] },
  { scenario: familyUpdate, weight: 5, hours: [17, 18, 19, 20] },
  { scenario: goodDayShare, weight: 5, hours: [17, 18, 19, 20, 21] },
  { scenario: healthFitness, weight: 4, hours: [7, 8, 17, 18, 19] },
  { scenario: deepTalk, weight: 3, hours: [21, 22, 23] },
  { scenario: supportValidation, weight: 4, hours: [19, 20, 21, 22, 23] },
  { scenario: celebration, weight: 2, hours: [17, 18, 19, 20, 21] },
  { scenario: lateNightTalk, weight: 3, hours: [23, 0, 1] },
  { scenario: insideJoke, weight: 4, hours: [12, 13, 18, 19, 20, 21] },
  { scenario: newsReaction, weight: 4, hours: [9, 12, 18, 19, 20] },
  { scenario: goodNight, weight: 6, hours: [22, 23] },
];

const HOLIDAY_SCENARIOS: Partial<Record<number, WeightedScenario[]>> = {
  9: [{ scenario: celebration, weight: 3, hours: [17, 18, 19, 20], months: [9] }], // Oct: Halloween-ish energy via generic celebration
  10: [{ scenario: familyUpdate, weight: 6, hours: [17, 18, 19, 20], months: [10] }], // Nov: Thanksgiving
  11: [{ scenario: celebration, weight: 6, hours: [17, 18, 19, 20, 21], months: [11] }], // Dec: holidays
};

function weightedScenarioPool(month: number): WeightedScenario[] {
  const pool = SCENARIOS.filter((s) => !s.months || s.months.includes(month));
  const extra = HOLIDAY_SCENARIOS[month] ?? [];
  return [...pool, ...extra];
}

function pickScenario(rng: Rand, month: number, hour: number): WeightedScenario {
  const pool = weightedScenarioPool(month);
  const inHourWindow = pool.filter((s) => s.hours.includes(hour));
  const candidates = inHourWindow.length > 0 ? inHourWindow : pool;
  const total = candidates.reduce((sum, s) => sum + s.weight, 0);
  let r = rng() * total;
  for (const s of candidates) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return candidates[candidates.length - 1];
}

// ---------------------------------------------------------------------------
// Timestamp scheduling
// ---------------------------------------------------------------------------

const WEEKDAY_HOUR_WEIGHTS: [number, number][] = [
  [7, 2], [8, 3], [9, 2], [12, 4], [13, 3], [17, 5], [18, 7], [19, 8], [20, 8], [21, 7], [22, 5], [23, 3], [0, 1],
];
const WEEKEND_HOUR_WEIGHTS: [number, number][] = [
  [9, 3], [10, 5], [11, 6], [12, 6], [13, 5], [14, 4], [15, 4], [16, 5], [17, 6], [18, 6], [19, 6], [20, 6], [21, 6], [22, 5], [23, 3], [0, 2], [1, 1],
];

function weightedHour(rng: Rand, isWeekend: boolean): number {
  const table = isWeekend ? WEEKEND_HOUR_WEIGHTS : WEEKDAY_HOUR_WEIGHTS;
  const total = table.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [hour, w] of table) {
    r -= w;
    if (r <= 0) return hour;
  }
  return table[table.length - 1][0];
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

const MIN_MESSAGES = 10500;

export function generateSampleMessages(): Message[] {
  const rng = mulberry32(20260706);
  const messages: Message[] = [];

  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 365);

  const day = new Date(start);
  while (day <= end) {
    const dow = day.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const month = day.getMonth();

    // Seasonal volume bump: more texting in summer + around the holidays,
    // a slight winter-blues dip in January.
    const seasonalMultiplier = month === 11 ? 1.35 : month === 0 ? 0.85 : month >= 5 && month <= 7 ? 1.2 : 1;

    let numBursts = Math.round((isWeekend ? randInt(rng, 3, 7) : randInt(rng, 2, 5)) * seasonalMultiplier);
    if (chance(rng, 0.08)) numBursts = randInt(rng, 0, 1); // an unplugged / busy day
    else if (chance(rng, 0.04)) numBursts = numBursts * 2; // an unusually chatty day

    let cursor = new Date(day);

    for (let b = 0; b < numBursts; b++) {
      const hour = weightedHour(rng, isWeekend);
      const minute = randInt(rng, 0, 59);
      const burstStart = new Date(day);
      burstStart.setHours(hour === 0 || hour === 1 ? hour + 24 : hour, minute, randInt(rng, 0, 59), 0);
      if (burstStart <= cursor) burstStart.setMinutes(burstStart.getMinutes() + randInt(rng, 5, 20));

      const isConflictDay = chance(rng, 0.018);
      const scenario = isConflictDay ? conflictThenRepair : pickScenario(rng, month, hour).scenario;
      const lines = scenario(rng, { month, isWeekend });

      const firstSpeaker: 0 | 1 = chance(rng, 0.5) ? 0 : 1;
      let t = burstStart.getTime();

      for (const line of lines) {
        const author = (line.who === 0 ? firstSpeaker : 1 - firstSpeaker) === 0 ? NAME_A : NAME_B;
        messages.push({
          timestamp: new Date(t),
          author,
          content: line.text,
          platform: 'Generic',
          sourceFile: 'sample-data.json',
        });
        const gap = chance(rng, 0.06) ? randInt(rng, 900, 3600) : chance(rng, 0.25) ? randInt(rng, 30, 240) : randInt(rng, 5, 60);
        t += gap * 1000;
      }

      cursor = new Date(t);
    }

    day.setDate(day.getDate() + 1);
  }

  // Safety top-up: pad with light small-talk bursts on random existing days
  // until we clear the message-count floor, in case a run lands short.
  let guard = 0;
  while (messages.length < MIN_MESSAGES && guard < 5000) {
    guard += 1;
    const anchor = messages[randInt(rng, 0, messages.length - 1)];
    const scenario = pick(rng, [meme, planLogistics, foodTalk, morningCheckIn] as Scenario[]);
    const lines = scenario(rng, { month: anchor.timestamp.getMonth(), isWeekend: false });
    const firstSpeaker: 0 | 1 = chance(rng, 0.5) ? 0 : 1;
    let t = anchor.timestamp.getTime() + randInt(rng, 3600, 7200) * 1000;
    for (const line of lines) {
      const author = (line.who === 0 ? firstSpeaker : 1 - firstSpeaker) === 0 ? NAME_A : NAME_B;
      messages.push({ timestamp: new Date(t), author, content: line.text, platform: 'Generic', sourceFile: 'sample-data.json' });
      t += randInt(rng, 10, 90) * 1000;
    }
  }

  return messages;
}

export const SAMPLE_DATA_AUTHORS = [NAME_A, NAME_B];
