export const HERO_PROFILE = {
  name: 'Clara Z.',
  username: 'clara.zk',
  avatar: '/demo/clara-z.webp',
} as const;

export const HERO_COMPOSER_MEDIA = {
  photo: '/demo/composer-photo.webp',
  reel: '/demo/composer-reel.webp',
} as const;

export type HeroSender = 'clara' | 'you';

export type HeroContent =
  | { type: 'text'; text: string }
  | { type: 'media'; label: 'photo'; image: string; alt: string }
  | {
      type: 'shared-post';
      source: string;
      caption: string;
      image: string;
      alt: string;
    };

export interface HeroReply {
  sender: string;
  preview: string;
}

export interface HeroDemoMessage {
  key: string;
  sender: HeroSender;
  timestamp: { time: string; date: 'Tuesday' | 'Wednesday' };
  showDate: boolean;
  showTime: boolean;
  content: HeroContent;
  reply?: HeroReply;
}

type RawMessage =
  | readonly [time: string, sender: HeroSender, text: string, reply?: HeroReply]
  | readonly [
      time: string,
      sender: HeroSender,
      content: Exclude<HeroContent, { type: 'text' }>,
    ];

const photo = (
  image: string,
  alt: string,
): Exclude<HeroContent, { type: 'text' | 'shared-post' }> => ({
  type: 'media',
  label: 'photo',
  image,
  alt,
});

const reel = (
  source: string,
  caption: string,
  image: string,
  alt: string,
): Extract<HeroContent, { type: 'shared-post' }> => ({
  type: 'shared-post',
  source,
  caption,
  image,
  alt,
});

const tuesday: readonly RawMessage[] = [
  ['9:18 AM', 'clara', 'did you export the new version'],
  ['9:19 AM', 'you', 'nope'],
  ['9:19 AM', 'you', 'i fell asleep 😭'],
  ['9:20 AM', 'clara', 'incredible'],
  ['9:20 AM', 'clara', "professional operation we're running here"],
  ['9:22 AM', 'you', 'give me like 20 mins'],
  ['9:22 AM', 'clara', 'take your time'],
  ['9:22 AM', 'clara', "i'm getting coffee anyway"],
  ['9:37 AM', 'you', 'wait'],
  ['9:37 AM', 'you', 'which one did you like more'],
  ['9:37 AM', 'you', 'the white one or the one with the huge title'],
  ['9:40 AM', 'clara', 'huge title'],
  ['9:40 AM', 'clara', 'the white one looks too clean'],
  ['9:41 AM', 'you', "that's what i thought"],
  ['9:41 AM', 'you', 'looks like a bank made a zine'],
  ['9:41 AM', 'clara', 'exactly lol'],
  [
    '9:43 AM',
    'you',
    photo('/demo/poster-mockup.webp', 'Poster mockup on a laptop and desk'),
  ],
  ['9:44 AM', 'you', 'this one?'],
  ['9:45 AM', 'clara', 'YES'],
  ['9:45 AM', 'clara', 'move the date down a little though'],
  ['9:45 AM', 'clara', "it's fighting the photo"],
  ['9:46 AM', 'you', 'true'],
  ['9:47 AM', 'you', 'what about the red'],
  ['9:48 AM', 'clara', 'keep it'],
  ['9:48 AM', 'clara', 'otherwise everything is beige and depressing'],
  ['9:48 AM', 'you', 'beige and depressing is contemporary design'],
  ['9:49 AM', 'clara', 'unfortunately'],
  ['10:06 AM', 'clara', 'btw'],
  ['10:06 AM', 'clara', 'look at this'],
  [
    '10:07 AM',
    'clara',
    reel(
      'design.archive',
      'Swiss posters from the 1970s',
      '/demo/swiss-posters-reel.webp',
      'Swiss poster archive Reel',
    ),
  ],
  ['10:08 AM', 'you', 'oh this is hard'],
  ['10:08 AM', 'you', 'second one especially'],
  ['10:09 AM', 'clara', "that's what i was thinking for the back"],
  ['10:10 AM', 'you', 'the tiny type?'],
  ['10:10 AM', 'clara', 'yeah'],
  ['10:10 AM', 'clara', 'just names / date / place'],
  ['10:11 AM', 'you', 'bet'],
  ['11:34 AM', 'you', 'exported'],
  ['11:34 AM', 'you', 'finally'],
  ['11:35 AM', 'clara', 'send'],
  [
    '11:36 AM',
    'you',
    photo(
      '/demo/finished-poster.webp',
      'Finished red, black, and cream poster',
    ),
  ],
  ['11:37 AM', 'clara', 'wait this is actually good'],
  ['11:37 AM', 'you', '“actually” 😭'],
  ['11:38 AM', 'clara', 'you know what i mean'],
  ['11:38 AM', 'clara', "don't start"],
  ['11:39 AM', 'you', "nah i'm quitting"],
  ['11:39 AM', 'clara', 'after doing all the work?'],
  ['11:39 AM', 'you', 'especially after doing all the work'],
  ['11:40 AM', 'clara', 'very efficient labor strategy'],
  ['12:12 PM', 'clara', 'are you going to campus later'],
  ['12:14 PM', 'you', 'yeah probably around 2'],
  ['12:14 PM', 'clara', 'can you bring the prints'],
  ['12:15 PM', 'you', "if the printer doesn't decide to kill itself again"],
  ['12:15 PM', 'clara', 'fair'],
  ['12:16 PM', 'clara', 'third floor printer'],
  ['12:16 PM', 'clara', 'NOT the library one'],
  ['12:17 PM', 'you', 'why'],
  ['12:17 PM', 'clara', 'library one made everything green yesterday'],
  ['12:17 PM', 'you', 'lmao'],
  ['1:03 PM', 'you', 'printer works'],
  ['1:03 PM', 'you', 'society survives another day'],
  ['1:05 PM', 'clara', 'historic victory'],
  [
    '1:05 PM',
    'you',
    photo('/demo/printed-posters.webp', 'Stack of freshly printed posters'),
  ],
  ['1:05 PM', 'you', '20 enough?'],
  ['1:06 PM', 'clara', 'yeah'],
  ['1:06 PM', 'clara', 'maybe 25?'],
  ['1:07 PM', 'you', 'mf'],
  ['1:07 PM', 'clara', 'sorry 😭'],
  ['2:21 PM', 'clara', 'where are you'],
  ['2:23 PM', 'you', 'union'],
  ['2:23 PM', 'clara', 'upstairs?'],
  ['2:23 PM', 'you', 'yep'],
  ['2:24 PM', 'clara', 'coming'],
  ['3:48 PM', 'clara', 'i forgot my charger there'],
  ['3:49 PM', 'you', 'black usb c?'],
  ['3:49 PM', 'clara', 'yes'],
  ['3:50 PM', 'you', 'i have it'],
  ['3:50 PM', 'clara', "you're a hero"],
  ['3:50 PM', 'you', '$14.99 to get it back'],
  ['3:51 PM', 'clara', 'exploitation'],
  ['3:51 PM', 'you', 'market price'],
  ['5:14 PM', 'clara', 'okay serious question'],
  ['5:14 PM', 'clara', 'should we put the little paragraph on the poster'],
  ['5:15 PM', 'you', 'absolutely not'],
  ['5:15 PM', 'clara', 'why'],
  [
    '5:16 PM',
    'you',
    'because nobody standing in a hallway wants to read a manifesto',
  ],
  ['5:16 PM', 'clara', 'coward'],
  ['5:16 PM', 'you', 'put it on the site'],
  ['5:17 PM', 'clara', 'fine'],
  [
    '5:52 PM',
    'you',
    'already did',
    { sender: 'Clara Z.', preview: 'put it on the site' },
  ],
  ['5:53 PM', 'clara', 'send link'],
  ['5:54 PM', 'you', 'still deploying'],
  ['5:54 PM', 'clara', 'of course'],
  ['5:56 PM', 'you', 'okay now'],
  ['5:57 PM', 'clara', 'mobile is broken'],
  ['5:57 PM', 'you', 'WHAT'],
  ['5:57 PM', 'clara', '💀'],
  ['5:58 PM', 'you', 'hold on'],
  ['6:06 PM', 'you', 'fixed'],
  ['6:07 PM', 'clara', 'yeah'],
  ['6:07 PM', 'clara', 'much better'],
  ['6:08 PM', 'clara', 'the image is still huge though'],
  ['6:08 PM', 'you', 'intentional'],
  ['6:09 PM', 'clara', 'sure'],
  [
    '6:30 PM',
    'clara',
    reel(
      'catworkers',
      'cat repeatedly falling asleep on a keyboard',
      '/demo/cat-keyboard-reel.webp',
      'Cat asleep on a keyboard Reel',
    ),
  ],
  ['6:31 PM', 'clara', 'you coding tonight'],
  ['6:31 PM', 'you', 'basically'],
  ['6:32 PM', 'you', "that's literally me"],
  ['6:32 PM', 'clara', 'thought so'],
  ['8:46 PM', 'you', 'did you eat btw'],
  ['8:49 PM', 'clara', 'yeah'],
  ['8:49 PM', 'clara', 'you?'],
  ['8:50 PM', 'you', 'not yet'],
  ['8:50 PM', 'clara', 'go eat'],
  ['8:50 PM', 'you', 'later'],
  ['8:51 PM', 'clara', 'no'],
  ['8:51 PM', 'clara', 'now'],
  ['8:51 PM', 'you', 'okay mom'],
  ['10:14 PM', 'clara', 'i changed two lines in the description'],
  ['10:14 PM', 'clara', "don't be mad"],
  ['10:15 PM', 'you', 'what did you do'],
  ['10:15 PM', 'clara', 'nothing crazy'],
  ['10:16 PM', 'clara', 'refresh'],
  ['10:17 PM', 'you', 'oh'],
  ['10:17 PM', 'you', "yeah that's better actually"],
  ['10:18 PM', 'clara', 'screenshotting this'],
  ['10:18 PM', 'you', 'shut up'],
];

const wednesday: readonly RawMessage[] = [
  ['8:03 AM', 'clara', 'awake?'],
  ['8:27 AM', 'you', 'unfortunately'],
  ['8:28 AM', 'clara', 'meeting moved to 11'],
  ['8:28 AM', 'you', 'god bless'],
  ['8:29 AM', 'clara', "knew you'd appreciate that"],
  ['9:11 AM', 'you', 'do we have the room confirmed'],
  ['9:13 AM', 'clara', '204'],
  ['9:13 AM', 'clara', 'i think'],
  ['9:14 AM', 'you', 'reassuring'],
  ['9:15 AM', 'clara', 'checking'],
  ['9:17 AM', 'clara', 'yes 204'],
  ['9:42 AM', 'clara', 'found this btw'],
  [
    '9:42 AM',
    'clara',
    photo('/demo/archival-flyer.webp', 'Old photocopied archival flyer'),
  ],
  ['9:43 AM', 'you', 'where tf did you find that'],
  ['9:43 AM', 'clara', 'basement archive'],
  ['9:44 AM', 'clara', 'look at the type at the bottom'],
  ['9:45 AM', 'you', 'ohhh'],
  ['9:45 AM', 'you', "wait that's perfect"],
  ['9:46 AM', 'clara', 'exactly'],
  ['10:02 AM', 'you', 'stealing it'],
  ['10:02 AM', 'clara', '*learning from history'],
  ['10:03 AM', 'you', 'sure clara'],
  ['10:03 AM', 'clara', '😇'],
  ['10:38 AM', 'you', 'headed over'],
  ['10:39 AM', 'clara', "i'm already here"],
  ['10:39 AM', 'you', 'nerd'],
  [
    '10:40 AM',
    'clara',
    'says the person bringing a laptop to a 20 minute meeting',
  ],
  ['10:40 AM', 'you', 'you never know'],
  ['10:41 AM', 'clara', 'you absolutely know'],
];

function toMinutes(time: string): number {
  const match = /^(\d{1,2}):(\d{2}) (AM|PM)$/u.exec(time);
  if (!match) return 0;
  const [, hourText = '0', minuteText = '0', period = 'AM'] = match;
  const hour = (Number(hourText) % 12) + (period === 'PM' ? 12 : 0);
  return hour * 60 + Number(minuteText);
}

function buildDay(
  date: HeroDemoMessage['timestamp']['date'],
  raw: readonly RawMessage[],
  offset: number,
): HeroDemoMessage[] {
  return raw.map(([time, sender, value, reply], index) => {
    const content: HeroContent =
      typeof value === 'string' ? { type: 'text', text: value } : value;
    const previous = raw[index - 1];
    const showTime =
      index === 0 ||
      (previous !== undefined &&
        toMinutes(time) - toMinutes(previous[0]) >= 15);

    return {
      key: `seed-${offset + index + 1}`,
      sender,
      timestamp: { time, date },
      showDate: index === 0,
      showTime,
      content,
      ...(reply ? { reply } : {}),
    };
  });
}

export const HERO_MESSAGES: readonly HeroDemoMessage[] = [
  ...buildDay('Tuesday', tuesday, 0),
  ...buildDay('Wednesday', wednesday, tuesday.length),
];
