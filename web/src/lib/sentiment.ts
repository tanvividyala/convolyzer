import type { SentimentTurn, Turn } from '../types';

/**
 * A compact VADER-flavored lexical sentiment scorer that runs fully in the
 * browser with no API key, mirroring the local VADER pass the Streamlit app
 * used. It is intentionally small: a valence lexicon plus negation, booster,
 * emoji, and punctuation handling. It will not catch sarcasm or inside jokes,
 * but it gives an instant, free baseline; the AI path handles nuance.
 */

// Word -> valence in roughly [-4, 4], AFINN-style.
const LEXICON: Record<string, number> = {
  // strong positive
  love: 3, loved: 3, loves: 3, amazing: 3, awesome: 3, excellent: 3, perfect: 3,
  wonderful: 3, fantastic: 3, best: 3, happy: 3, glad: 2, excited: 3, yay: 2,
  congrats: 3, congratulations: 3, thank: 2, thanks: 2, thankful: 2, grateful: 3,
  proud: 2, beautiful: 3, gorgeous: 3, cute: 2, sweet: 2, fun: 2, funny: 2,
  hilarious: 3, lol: 1, lmao: 1, haha: 1, hehe: 1, nice: 2, good: 2, great: 3,
  cool: 2, yes: 1, yess: 2, win: 2, won: 2, congrat: 3, adorable: 3, lovely: 3,
  enjoy: 2, enjoyed: 2, relieved: 2, hope: 1, hopeful: 2, blessed: 2, delighted: 3,
  // mild positive
  okay: 1, ok: 1, fine: 1, alright: 1, sure: 1, agree: 1, like: 1, liked: 1,
  // strong negative
  hate: -3, hated: -3, hates: -3, terrible: -3, awful: -3, horrible: -3,
  worst: -3, disgusting: -3, angry: -2, mad: -2, furious: -3, annoyed: -2,
  annoying: -2, sad: -2, depressed: -3, cry: -2, crying: -2, upset: -2,
  hurt: -2, pain: -2, painful: -2, scared: -2, afraid: -2, anxious: -2,
  worried: -2, worry: -2, stressed: -2, stress: -2, tired: -1, exhausted: -2,
  sick: -2, sorry: -1, bad: -2, wrong: -2, fail: -2, failed: -2, ugh: -2,
  hell: -1, damn: -1, stupid: -2, dumb: -2, hurts: -2, miserable: -3,
  lonely: -2, frustrated: -2, frustrating: -2, disappointed: -2, jealous: -1,
  // mild negative
  no: -1, nope: -1, nah: -1, meh: -1, whatever: -1, boring: -1, bored: -1,
  bummer: -1, unfortunately: -1, ignore: -1, ignored: -2, ignoring: -2,
};

const BOOSTERS: Record<string, number> = {
  very: 0.3, really: 0.3, so: 0.3, super: 0.4, extremely: 0.5, incredibly: 0.5,
  absolutely: 0.4, totally: 0.3, completely: 0.4, hella: 0.4, mad: 0.3,
  kinda: -0.2, kind: -0.15, sorta: -0.2, slightly: -0.3, barely: -0.3, little: -0.2,
};

const NEGATIONS = new Set([
  'not', "n't", 'no', 'never', 'none', 'nobody', 'nothing', 'neither', 'nor',
  'cannot', "can't", "won't", "don't", "didn't", "doesn't", "isn't", "wasn't",
  "aren't", "weren't", "ain't", 'without',
]);

const POS_EMOJI = /[\u{1F600}-\u{1F60F}\u{1F617}-\u{1F61D}\u{1F638}-\u{1F63B}❤\u{1F495}-\u{1F49F}\u{1F60D}\u{1F970}\u{1F929}\u{1F973}\u{1F44D}\u{1F389}\u{1F60A}]/u;
const NEG_EMOJI = /[\u{1F612}-\u{1F616}\u{1F61E}-\u{1F62F}\u{1F63E}\u{1F494}\u{1F44E}\u{1F620}-\u{1F624}\u{1F62D}\u{1F613}]/u;

const NORM = 3.5; // scale factor so typical scores land in ~[-1, 1]

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'’\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Score a single message. */
export function scoreText(text: string): { sentiment: number; intensity: number } {
  if (!text || !text.trim()) return { sentiment: 0, intensity: 0 };

  const tokens = tokenize(text);
  let sum = 0;
  let hits = 0;

  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i].replace(/’/g, "'");
    let valence = LEXICON[word];
    if (valence === undefined) continue;

    // Look back up to 3 tokens for boosters and negations.
    let booster = 0;
    let negated = false;
    for (let j = Math.max(0, i - 3); j < i; j++) {
      const prev = tokens[j].replace(/’/g, "'");
      if (BOOSTERS[prev]) booster += BOOSTERS[prev];
      if (NEGATIONS.has(prev)) negated = true;
    }
    valence += Math.sign(valence) * booster;
    if (negated) valence *= -0.75;

    sum += valence;
    hits += 1;
  }

  // Emoji nudges.
  if (POS_EMOJI.test(text)) { sum += 1.5; hits += 1; }
  if (NEG_EMOJI.test(text)) { sum -= 1.5; hits += 1; }

  // Exclamation amplifies the existing polarity slightly.
  const bangs = (text.match(/!/g) || []).length;
  if (bangs > 0) sum *= 1 + Math.min(bangs, 3) * 0.05;

  const sentiment = Math.max(-1, Math.min(1, sum / NORM));
  // Intensity: emotional strength regardless of polarity, damped by message length.
  const intensity = hits === 0 ? 0 : Math.max(0, Math.min(1, Math.abs(sum) / NORM));

  return { sentiment, intensity };
}

/** Score every turn locally. */
export function scoreLocal(turns: Turn[]): SentimentTurn[] {
  return turns.map((t) => {
    const { sentiment, intensity } = scoreText(t.content);
    return { turnIndex: t.turnIndex, sentiment, intensity };
  });
}
