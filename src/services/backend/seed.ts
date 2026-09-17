import type {
  Claim,
  Conversation,
  DatingPreferences,
  Dimension,
  EvidenceType,
  Introduction,
  IntroductionDecision,
  Match,
  Message,
  Profile,
  ProfilePhoto,
  ReflectionEvent,
  SensitiveConsent,
} from '@/types/domain';
import type { Session } from '@/types/views';

export interface DevState {
  profiles: Map<string, Profile>;
  preferences: Map<string, DatingPreferences>;
  consents: SensitiveConsent[];
  photos: ProfilePhoto[];
  claims: Claim[];
  revisions: import('@/types/domain').ModelRevision[];
  reflections: ReflectionEvent[];
  introductions: Introduction[];
  explanations: import('@/types/domain').IntroductionExplanation[];
  decisions: IntroductionDecision[];
  matches: Match[];
  conversations: Conversation[];
  messages: Message[];
  reports: import('@/types/domain').Report[];
  blocks: import('@/types/domain').Block[];
  dateOutcomes: import('@/types/domain').DateOutcome[];
  events: import('@/types/domain').ProductEvent[];
  usage: import('@/types/domain').AiUsageRecord[];
  usersByEmail: Map<string, Session>;
  autoInterested: Set<string>;
  pendingOtp: Map<string, string>;
  session: Session | null;
}

const T0 = new Date('2026-09-01T09:00:00.000Z');
function daysAgo(n: number): string {
  return new Date(T0.getTime() - n * 86400000).toISOString();
}

function photo(userId: string, img: number, position: number): ProfilePhoto {
  return {
    id: `photo-${userId}-${position}`,
    userId,
    storagePath: `https://i.pravatar.cc/600?img=${img}`,
    position,
    isPrimary: position === 0,
    moderationStatus: 'active',
  };
}

function claim(
  userId: string,
  dimension: Dimension,
  value: string,
  importance: number,
  sourceType: EvidenceType = 'onboarding_answer',
): Claim {
  return {
    id: `claim-${userId}-${dimension}`,
    userId,
    dimension,
    value,
    claimType: 'stated',
    confidence: 'explicit_high',
    importance,
    status: 'confirmed',
    sourceType,
    supersededBy: null,
    createdAt: daysAgo(20),
    updatedAt: daysAgo(20),
  };
}

interface SeedPerson {
  id: string;
  email?: string;
  name: string;
  dob: string;
  gender: Profile['gender'];
  area: string;
  lat: number;
  lng: number;
  occupation: string | null;
  bio: string;
  img: number;
  prefs: Omit<DatingPreferences, 'userId'>;
  claims: { d: Dimension; v: string; i: number }[];
  autoInterested?: boolean;
  verification?: Profile['verificationStatus'];
}

const PEOPLE: SeedPerson[] = [
  {
    id: 'ava',
    email: 'demo@kindred.app',
    name: 'Ava',
    dob: '1999-04-12',
    gender: 'woman',
    area: 'Maxvorstadt',
    lat: 48.147,
    lng: 11.567,
    occupation: 'Architecture MSc',
    bio: 'Slow mornings, long museum afternoons, and a good bookshop are my ideal Saturday.',
    img: 5,
    verification: 'selfie_verified',
    prefs: {
      preferredGenders: ['man'],
      minAge: 25,
      maxAge: 33,
      maxDistanceKm: 25,
      relationshipGoal: 'long_term',
      smokingDealbreaker: true,
      childrenIntent: 'open',
      childrenDealbreaker: false,
    },
    claims: [
      { d: 'independence', v: 'independent', i: 4 },
      { d: 'planning_style', v: 'planner', i: 4 },
      { d: 'social_frequency', v: 'balanced', i: 3 },
      { d: 'work_life_balance', v: 'balanced', i: 3 },
    ],
  },
  {
    id: 'liam',
    name: 'Liam',
    dob: '1997-02-20',
    gender: 'man',
    area: 'Schwabing',
    lat: 48.161,
    lng: 11.586,
    occupation: 'Product designer',
    bio: 'Cyclist, amateur potter, and a firm believer that the best plans are made a week ahead.',
    img: 12,
    verification: 'selfie_verified',
    autoInterested: true,
    prefs: {
      preferredGenders: ['woman'],
      minAge: 24,
      maxAge: 32,
      maxDistanceKm: 20,
      relationshipGoal: 'long_term',
      smokingDealbreaker: false,
      childrenIntent: 'open',
      childrenDealbreaker: false,
    },
    claims: [
      { d: 'independence', v: 'independent', i: 4 },
      { d: 'planning_style', v: 'planner', i: 3 },
      { d: 'social_frequency', v: 'balanced', i: 3 },
      { d: 'emotional_openness', v: 'open', i: 3 },
    ],
  },
  {
    id: 'david',
    name: 'David',
    dob: '1995-11-05',
    gender: 'man',
    area: 'Glockenbachviertel',
    lat: 48.13,
    lng: 11.573,
    occupation: 'Data scientist',
    bio: 'Runner, ramen obsessive, and always up for a spontaneous weekend trip.',
    img: 15,
    verification: 'selfie_verified',
    autoInterested: true,
    prefs: {
      preferredGenders: ['woman'],
      minAge: 24,
      maxAge: 33,
      maxDistanceKm: 30,
      relationshipGoal: 'long_term',
      smokingDealbreaker: false,
      childrenIntent: 'open',
      childrenDealbreaker: false,
    },
    claims: [
      { d: 'independence', v: 'balanced', i: 3 },
      { d: 'emotional_openness', v: 'open', i: 3 },
    ],
  },
  {
    id: 'noah',
    name: 'Noah',
    dob: '1998-07-19',
    gender: 'man',
    area: 'Haidhausen',
    lat: 48.13,
    lng: 11.6,
    occupation: 'Musician',
    bio: 'Late nights, spontaneous gigs, and a very full social calendar.',
    img: 33,
    verification: 'email_verified',
    autoInterested: true,
    prefs: {
      preferredGenders: ['woman'],
      minAge: 23,
      maxAge: 32,
      maxDistanceKm: 25,
      relationshipGoal: 'long_term',
      smokingDealbreaker: false,
      childrenIntent: 'open',
      childrenDealbreaker: false,
    },
    claims: [
      { d: 'planning_style', v: 'spontaneous', i: 3 },
      { d: 'independence', v: 'togetherness', i: 3 },
      { d: 'social_frequency', v: 'social', i: 4 },
    ],
  },
  {
    id: 'mateo',
    name: 'Mateo',
    dob: '2000-01-30',
    gender: 'man',
    area: 'Neuhausen',
    lat: 48.155,
    lng: 11.54,
    occupation: 'Startup founder',
    bio: 'Building something ambitious. Weekends are for recharging and good espresso.',
    img: 51,
    verification: 'selfie_verified',
    autoInterested: true,
    prefs: {
      preferredGenders: ['woman'],
      minAge: 24,
      maxAge: 31,
      maxDistanceKm: 20,
      relationshipGoal: 'long_term',
      smokingDealbreaker: false,
      childrenIntent: 'open',
      childrenDealbreaker: false,
    },
    claims: [
      { d: 'work_life_balance', v: 'work_focused', i: 4 },
      { d: 'ambition', v: 'driven', i: 4 },
      { d: 'planning_style', v: 'planner', i: 3 },
    ],
  },
  {
    id: 'jonas',
    name: 'Jonas',
    dob: '1996-05-14',
    gender: 'man',
    area: 'Sendling',
    lat: 48.121,
    lng: 11.545,
    occupation: 'Chef',
    bio: 'Cigarette on the balcony, wine with friends, and long dinners that run past midnight.',
    img: 60,
    verification: 'email_verified',
    prefs: {
      preferredGenders: ['woman'],
      minAge: 24,
      maxAge: 34,
      maxDistanceKm: 25,
      relationshipGoal: 'long_term',
      smokingDealbreaker: false,
      childrenIntent: 'open',
      childrenDealbreaker: false,
    },
    // smokes -> excluded by Ava's smoking dealbreaker
    claims: [{ d: 'social_frequency', v: 'social', i: 3 }],
  },
  {
    id: 'emil',
    name: 'Emil',
    dob: '1994-09-02',
    gender: 'man',
    area: 'Bogenhausen',
    lat: 48.15,
    lng: 11.62,
    occupation: 'Lawyer',
    bio: 'Settled, certain about the big things, and looking for the same.',
    img: 68,
    verification: 'selfie_verified',
    prefs: {
      preferredGenders: ['woman'],
      minAge: 24,
      maxAge: 32,
      maxDistanceKm: 20,
      relationshipGoal: 'life_partner',
      smokingDealbreaker: false,
      childrenIntent: 'dont_want',
      childrenDealbreaker: true,
    },
    claims: [{ d: 'long_term_orientation', v: 'serious', i: 5 }],
  },
  {
    id: 'ben',
    name: 'Ben',
    dob: '1997-12-11',
    gender: 'man',
    area: 'Au',
    lat: 48.123,
    lng: 11.58,
    occupation: 'Journalist',
    bio: 'Curious about everything. Ask me about the last thing I fell down a rabbit hole on.',
    img: 11,
    verification: 'selfie_verified',
    prefs: {
      preferredGenders: ['woman'],
      minAge: 24,
      maxAge: 33,
      maxDistanceKm: 30,
      relationshipGoal: 'long_term',
      smokingDealbreaker: false,
      childrenIntent: 'open',
      childrenDealbreaker: false,
    },
    claims: [
      { d: 'work_life_balance', v: 'work_focused', i: 3 },
      { d: 'planning_style', v: 'spontaneous', i: 3 },
    ],
  },
  // A few additional community members for pool realism / diversity of prefs.
  {
    id: 'sophia',
    name: 'Sophia',
    dob: '1998-03-08',
    gender: 'woman',
    area: 'Schwabing',
    lat: 48.16,
    lng: 11.58,
    occupation: 'Researcher',
    bio: 'Climbing, cold-water swimming, and quiet Sundays.',
    img: 20,
    verification: 'selfie_verified',
    prefs: {
      preferredGenders: ['woman'],
      minAge: 24,
      maxAge: 32,
      maxDistanceKm: 20,
      relationshipGoal: 'long_term',
      smokingDealbreaker: false,
      childrenIntent: 'open',
      childrenDealbreaker: false,
    },
    claims: [{ d: 'activity_level', v: 'high', i: 3 }],
  },
  {
    id: 'elif',
    name: 'Elif',
    dob: '1996-06-25',
    gender: 'woman',
    area: 'Maxvorstadt',
    lat: 48.148,
    lng: 11.57,
    occupation: 'Doctor',
    bio: 'Long shifts, longer coffees. Looking for calm and warmth.',
    img: 45,
    verification: 'selfie_verified',
    prefs: {
      preferredGenders: ['man'],
      minAge: 27,
      maxAge: 36,
      maxDistanceKm: 25,
      relationshipGoal: 'life_partner',
      smokingDealbreaker: true,
      childrenIntent: 'want',
      childrenDealbreaker: true,
    },
    claims: [{ d: 'emotional_openness', v: 'open', i: 4 }],
  },
  {
    id: 'maya',
    name: 'Maya',
    dob: '2001-10-17',
    gender: 'woman',
    area: 'Glockenbachviertel',
    lat: 48.131,
    lng: 11.574,
    occupation: 'Illustrator',
    bio: 'Sketchbooks, second-hand shops, and very strong opinions about typography.',
    img: 26,
    verification: 'email_verified',
    prefs: {
      preferredGenders: ['man', 'woman'],
      minAge: 22,
      maxAge: 30,
      maxDistanceKm: 15,
      relationshipGoal: 'short_term',
      smokingDealbreaker: false,
      childrenIntent: 'unsure',
      childrenDealbreaker: false,
    },
    claims: [{ d: 'social_frequency', v: 'social', i: 3 }],
  },
];

export const DEMO_EMAIL = 'demo@kindred.app';

export function createSeedState(): DevState {
  const profiles = new Map<string, Profile>();
  const preferences = new Map<string, DatingPreferences>();
  const consents: SensitiveConsent[] = [];
  const photos: ProfilePhoto[] = [];
  const claims: Claim[] = [];
  const usersByEmail = new Map<string, Session>();
  const autoInterested = new Set<string>();

  for (const person of PEOPLE) {
    const profile: Profile = {
      id: person.id,
      displayName: person.name,
      dateOfBirth: person.dob,
      gender: person.gender,
      city: 'Munich',
      area: person.area,
      approxLat: person.lat,
      approxLng: person.lng,
      occupation: person.occupation,
      showOccupation: true,
      bio: person.bio,
      moderationStatus: 'active',
      verificationStatus: person.verification ?? 'email_verified',
      onboardingCompletedAt: daysAgo(20),
      createdAt: daysAgo(25),
    };
    profiles.set(person.id, profile);
    preferences.set(person.id, { userId: person.id, ...person.prefs });
    photos.push(photo(person.id, person.img, 0), photo(person.id, person.img + 1, 1));
    for (const c of person.claims) {
      claims.push(claim(person.id, c.d, c.v, c.i));
    }
    if (person.email) {
      usersByEmail.set(person.email.toLowerCase(), { userId: person.id, email: person.email });
    }
    if (person.autoInterested) autoInterested.add(person.id);
    for (const consentType of [
      'partner_gender_matching',
      'photo_processing',
      'ai_processing',
    ] as const) {
      consents.push({
        userId: person.id,
        consentType,
        granted: true,
        grantedAt: daysAgo(20),
        withdrawnAt: null,
        version: '1.0',
      });
    }
  }

  // Jonas smokes -> exercises Ava's smoking dealbreaker.
  claims.push(claim('jonas', 'alcohol', 'regular', 2));

  // --- A pending introduction: Ava -> Liam (well aligned) ---
  const introLiam: Introduction = {
    id: 'intro-ava-liam',
    userA: 'ava',
    userB: 'liam',
    status: 'active',
    createdBy: null,
    rankScore: 0.82,
    algoVersion: 'heuristic-v1',
    createdAt: daysAgo(1),
    expiresAt: null,
  };

  // --- An existing mutual match + conversation: Ava <-> David ---
  const introDavid: Introduction = {
    id: 'intro-ava-david',
    userA: 'ava',
    userB: 'david',
    status: 'matched',
    createdBy: null,
    rankScore: 0.71,
    algoVersion: 'heuristic-v1',
    createdAt: daysAgo(6),
    expiresAt: null,
  };
  const decisions: IntroductionDecision[] = [
    {
      introductionId: 'intro-ava-david',
      userId: 'ava',
      decision: 'interested',
      decidedAt: daysAgo(5),
    },
    {
      introductionId: 'intro-ava-david',
      userId: 'david',
      decision: 'interested',
      decidedAt: daysAgo(5),
    },
  ];
  const match: Match = {
    id: 'match-ava-david',
    introductionId: 'intro-ava-david',
    userA: 'ava',
    userB: 'david',
    createdAt: daysAgo(5),
    closedAt: null,
  };
  const conversation: Conversation = {
    id: 'conv-ava-david',
    matchId: 'match-ava-david',
    createdAt: daysAgo(5),
    lastMessageAt: daysAgo(4),
  };
  const messages: Message[] = [
    {
      id: 'msg-1',
      conversationId: 'conv-ava-david',
      senderId: 'david',
      body: 'Hi Ava! Your museum-Saturday plan sounds perfect. What are you into lately?',
      createdAt: daysAgo(5),
      readAt: daysAgo(5),
    },
    {
      id: 'msg-2',
      conversationId: 'conv-ava-david',
      senderId: 'ava',
      body: 'Currently deep in a Bauhaus phase. Also always accepting ramen recommendations.',
      createdAt: daysAgo(4),
      readAt: daysAgo(4),
    },
    {
      id: 'msg-3',
      conversationId: 'conv-ava-david',
      senderId: 'david',
      body: 'Then I know exactly where we should go. Free next Thursday?',
      createdAt: daysAgo(4),
      readAt: null,
    },
  ];

  // --- A past introduction + reflection example: Ava <-> Ben ---
  const introBen: Introduction = {
    id: 'intro-ava-ben',
    userA: 'ava',
    userB: 'ben',
    status: 'matched',
    createdBy: null,
    rankScore: 0.64,
    algoVersion: 'heuristic-v1',
    createdAt: daysAgo(14),
    expiresAt: null,
  };
  decisions.push(
    {
      introductionId: 'intro-ava-ben',
      userId: 'ava',
      decision: 'interested',
      decidedAt: daysAgo(13),
    },
    {
      introductionId: 'intro-ava-ben',
      userId: 'ben',
      decision: 'interested',
      decidedAt: daysAgo(13),
    },
  );
  const matchBen: Match = {
    id: 'match-ava-ben',
    introductionId: 'intro-ava-ben',
    userA: 'ava',
    userB: 'ben',
    createdAt: daysAgo(13),
    closedAt: null,
  };
  const reflections: ReflectionEvent[] = [
    {
      id: 'refl-ava-ben',
      userId: 'ava',
      introductionId: 'intro-ava-ben',
      rawText:
        'Really easy conversation, but it felt like we had completely different attitudes toward planning our week. I still think about how I was cheated on in my last relationship — that stays between us.',
      aiProcessed: true,
      createdAt: daysAgo(11),
    },
  ];

  return {
    profiles,
    preferences,
    consents,
    photos,
    claims,
    revisions: [],
    reflections,
    introductions: [introLiam, introDavid, introBen],
    explanations: [],
    decisions,
    matches: [match, matchBen],
    conversations: [conversation],
    messages,
    reports: [],
    blocks: [],
    dateOutcomes: [],
    events: [],
    usage: [],
    usersByEmail,
    autoInterested,
    pendingOtp: new Map(),
    session: null,
  };
}
