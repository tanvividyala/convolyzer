import type { Message } from '../types';

// "Oct 08, 2024 11:08:46 AM"
const TIMESTAMP_PATTERN = /^([A-Z][a-z]{2} \d{1,2}, \d{4}\s+\d{1,2}:\d{2}:\d{2} [AP]M)/;
const ATTACHMENT_PATTERN = /\/Users\/.+?\.(HEIC|heic|jpg|jpeg|png|gif|mp4|mov|pdf|txt|m4a)/;
const REACTION_PATTERN = /^Reacted .+ to/;

function parseTimestamp(str: string): Date | null {
  // "MMM DD, YYYY hh:mm:ss AM/PM"
  const match = str.match(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})\s+(\d{1,2}):(\d{2}):(\d{2}) ([AP]M)$/);
  if (!match) return null;
  const [, mon, day, year, hh, mm, ss, ampm] = match;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = months.indexOf(mon);
  if (monthIdx === -1) return null;
  let hour = parseInt(hh, 10) % 12;
  if (ampm === 'PM') hour += 12;
  const d = new Date(parseInt(year, 10), monthIdx, parseInt(day, 10), hour, parseInt(mm, 10), parseInt(ss, 10));
  return isNaN(d.getTime()) ? null : d;
}

export function parseIMessageTxt(text: string, sourceFile: string): Message[] {
  const lines = text.split('\n');
  const messages: Message[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const timestampMatch = line.match(TIMESTAMP_PATTERN);

    if (timestampMatch) {
      const timestampStr = timestampMatch[1].replace(/\s*\(Read by .+?\)/, '');
      const timestamp = parseTimestamp(timestampStr);
      if (!timestamp) {
        i += 1;
        continue;
      }
      i += 1;

      while (i < lines.length && !lines[i].trim()) {
        i += 1;
      }
      if (i >= lines.length) break;

      const senderLine = lines[i].trim();
      if (senderLine.startsWith('-') || senderLine.startsWith('Edited ') || TIMESTAMP_PATTERN.test(senderLine)) {
        i += 1;
        continue;
      }

      const sender = senderLine;
      i += 1;

      const contentLines: string[] = [];
      while (i < lines.length) {
        const currentLine = lines[i];

        if (TIMESTAMP_PATTERN.test(currentLine) && !currentLine.startsWith(' ')) {
          break;
        }

        const stripped = currentLine.trim();

        if (!stripped) {
          i += 1;
          continue;
        }
        if (stripped.startsWith('(Read by')) {
          i += 1;
          continue;
        }
        if (stripped === 'This message responded to an earlier message.') {
          i += 1;
          continue;
        }
        if (REACTION_PATTERN.test(stripped)) {
          i += 1;
          continue;
        }
        if (
          stripped === 'Tapbacks:' ||
          stripped.startsWith('Loved by') ||
          stripped.startsWith('Liked by') ||
          stripped.startsWith('Emphasized by') ||
          stripped.startsWith('Laughed at by') ||
          stripped.startsWith('Questioned by') ||
          stripped.startsWith('Disliked by')
        ) {
          i += 1;
          continue;
        }
        if (stripped.startsWith('Edited ') && stripped.includes(' later:')) {
          i += 1;
          continue;
        }
        if (ATTACHMENT_PATTERN.test(stripped)) {
          i += 1;
          continue;
        }
        if (currentLine.startsWith('    ') || currentLine.startsWith('\t')) {
          i += 1;
          continue;
        }

        const timestampInContent = stripped.match(TIMESTAMP_PATTERN);
        if (timestampInContent && timestampInContent.index !== undefined) {
          const after = stripped.slice(timestampInContent.index + timestampInContent[0].length).trim();
          if (after) contentLines.push(after);
          i += 1;
          continue;
        }

        contentLines.push(stripped);
        i += 1;
      }

      const content = contentLines.join(' ').trim();
      if (content) {
        messages.push({ timestamp, author: sender, content, platform: 'iMessage', sourceFile });
      }
    } else {
      i += 1;
    }
  }

  return messages;
}
