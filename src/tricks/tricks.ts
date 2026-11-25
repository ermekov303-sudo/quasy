/** Trick Library content: 25 fixed tricks, 5 categories × 5 levels. Static data, no recognition. */

export const LEVELS = ['easy', 'medium', 'rare', 'hard', 'epic'] as const
export type Level = (typeof LEVELS)[number]

export const LEVEL_META: Record<Level, { label: string; color: string }> = {
  easy: { label: 'Easy', color: '#22C55E' },
  medium: { label: 'Medium', color: '#EAB308' },
  rare: { label: 'Rare', color: '#3B82F6' },
  hard: { label: 'Hard', color: '#EF4444' },
  epic: { label: 'Epic', color: '#8B5CF6' },
}

export const CATEGORIES = ['footwork', 'rope', 'power', 'releases', 'multiples'] as const
export type CategoryId = (typeof CATEGORIES)[number]

export const CATEGORY_META: Record<CategoryId, { label: string; description: string }> = {
  footwork: {
    label: 'Footwork',
    description: 'Footwork tricks focus on leg movement, coordination, rhythm and changing foot positions while jumping rope.',
  },
  rope: {
    label: 'Rope Manipulation',
    description: 'Tricks involving hand positioning, rope direction, swings, crosses and complex rope control.',
  },
  power: {
    label: 'Power',
    description: 'Strength-oriented jump rope elements involving body positioning and controlled power movements.',
  },
  releases: {
    label: 'Releases',
    description: 'Tricks involving releasing one or both rope handles and regaining control of the rope.',
  },
  multiples: {
    label: 'Multiples',
    description: 'Tricks involving multiple rope rotations during a single jump.',
  },
}

export type Trick = {
  id: string
  name: string
  category: CategoryId
  level: Level
  description: string
  challenge: string
  video?: TrickVideo // without it the trick page shows a "coming soon" placeholder
}

/** Demo clip + attribution, which must stay visible (CC BY). */
export type TrickVideo = {
  src: string
  poster?: string
  credit: { label: string; url: string; license?: { name: string; url: string } }
}

// Clips downloaded once into public/tricks (480p, no audio) so we don't stream from the Tricktionary's Mux account.
const tt = (id: string, slug: string, title: string): TrickVideo => ({
  src: `/tricks/videos/${id}.mp4`,
  poster: `/tricks/posters/${id}.jpg`,
  credit: {
    label: `“${title}” on the Tricktionary`,
    url: `https://the-tricktionary.com/trick/sr/${slug}`,
    license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  },
})

export const TRICKS: Trick[] = [
  // Footwork
  { id: 'jogging-step', name: 'Jogging Step', category: 'footwork', level: 'easy',
    description: 'Alternate feet on every rope turn, as if jogging in place.',
    challenge: 'Keeping an even rhythm so each turn lands on exactly one foot.',
    video: tt('jogging-step', 'jogging-step', 'Jogging Step') },
  { id: 'side-straddle', name: 'Side Straddle', category: 'footwork', level: 'medium',
    description: 'Jump the feet apart to the sides, then back together, on alternating turns.',
    challenge: 'Timing the open and close with the rope and landing softly with the feet wide.',
    video: tt('side-straddle', 'straddle-jump', 'Straddle Jump') },
  { id: 'skier', name: 'Skier', category: 'footwork', level: 'rare',
    description: 'Hop with both feet together from side to side, like a skier.',
    challenge: 'Moving sideways on every jump without drifting or losing the timing.',
    video: tt('skier', 'skier', 'Skier') },
  { id: 'bell', name: 'Bell', category: 'footwork', level: 'hard',
    description: 'Hop with both feet together forward and back, like a swinging bell.',
    challenge: 'The forward–back travel keeps shifting your balance while the rope keeps turning.',
    video: tt('bell', 'bell', 'Bell') },
  { id: 'can-can', name: 'Can-Can', category: 'footwork', level: 'epic',
    description: 'A four-count pattern: knee lift, feet together, kick, feet together, then switch legs.',
    challenge: 'Coordinating a multi-count leg pattern on one leg at a time without breaking rhythm.',
    video: tt('can-can', 'can-can', 'Can Can') },

  // Rope Manipulation
  { id: 'side-swing', name: 'Side Swing', category: 'rope', level: 'easy',
    description: 'Swing the rope beside your body with both hands together, then open back into a jump.',
    challenge: 'Keeping the swing flat and even, and opening out of it at the right moment.',
    video: tt('side-swing', 'side-swing', 'Side Swing') },
  { id: 'criss-cross', name: 'Criss-Cross', category: 'rope', level: 'medium',
    description: 'Cross your arms in front of the body and jump through the crossed loop, then uncross.',
    challenge: 'Crossing deep enough at the waist so the loop is big enough to jump through.',
    video: tt('criss-cross', 'criss-cross', 'Criss Cross') },
  { id: 'toad', name: 'Toad', category: 'rope', level: 'rare',
    description: 'One arm crosses in front of the body and under the opposite raised leg.',
    challenge: 'The arm under the leg makes the loop small: you need a high leg lift and precise timing.',
    video: tt('toad', 'toad-leg-over-cross', 'Toad') },
  { id: 'eb', name: 'EB (Front-Back Cross)', category: 'rope', level: 'hard',
    description: 'One arm crosses in front of the body while the other crosses behind the back.',
    challenge: 'Arms work on opposite sides of the body, which needs shoulder mobility and a symmetric loop.',
    video: tt('eb', 'eb', 'EB') },
  { id: 'as-switch-cross', name: 'AS Switch Cross', category: 'rope', level: 'epic',
    description: 'Two consecutive AS crosses (both arms crossed behind the back), switching the arms between them.',
    challenge: 'You cannot see your hands, and the switch behind the back must happen inside one rope turn.',
    video: tt('as-switch-cross', 'as-switch-cross', 'AS Switch Cross') },

  // Power
  { id: 'pushup-fake', name: 'Pushup Fake', category: 'power', level: 'easy',
    description: 'Jump out into a push-up position, then come back up before jumping the rope.',
    challenge: 'Getting down and back up quickly enough to keep the rope rhythm.',
    video: tt('pushup-fake', 'pushup-fake', 'Pushup Fake') },
  { id: 'butt-bounce', name: 'Butt Bounce', category: 'power', level: 'medium',
    description: 'Drop to a seated position and bounce back up to your feet while the rope passes under.',
    challenge: 'Getting back up in a single rope turn using legs and core.',
    video: tt('butt-bounce', 'rump-jump', 'Rump Jump') },
  { id: 'frog', name: 'Frog', category: 'power', level: 'rare',
    description: 'Kick into a handstand and jump the rope as your legs snap down.',
    challenge: 'Supporting your body weight on your hands with control.',
    video: tt('frog', 'frog-donkey-kick', 'Frog') },
  { id: 'push-up-cross', name: 'Push-up Cross', category: 'power', level: 'hard',
    description: 'A push-up with a cross on the way up.',
    challenge: 'Combining upper-body strength with a cross while close to the floor.',
    video: tt('push-up-cross', 'pushup-cross', 'Pushup Cross') },
  { id: 'frog-cross', name: 'Frog Cross', category: 'power', level: 'epic',
    description: 'A frog with a cross on the way down.',
    challenge: 'Holding an inverted position on crossed arms while the rope passes under.',
    video: tt('frog-cross', 'frog-cross', 'Frog Cross') },

  // Releases
  { id: 'basic-release', name: 'Basic Release', category: 'releases', level: 'easy',
    description: 'Release one handle behind your feet, swing it back up and catch it.',
    challenge: 'Releasing at the right point so the handle comes back to your hand.',
    video: tt('basic-release', 'one-handle-release', 'One Handle Release') },
  { id: 'micro-release', name: 'Micro Release', category: 'releases', level: 'medium',
    description: 'Swing the rope to one side, release one handle, let the rope swing two or three times, then catch the handle (also called the Mic Release).',
    challenge: 'Keeping the free handle moving at the top of its arc and catching it without breaking the rhythm.',
    video: tt('micro-release', 'mic', 'Mic') },
  { id: 'mamba-release', name: 'Mamba Release', category: 'releases', level: 'rare',
    description: 'A mic release where the rope swings to both sides of the body before you catch the handle (also called Mic Switch Sides).',
    challenge: 'Controlling the path of the free handle so it returns to a catchable spot.',
    video: tt('mamba-release', 'mic-switch-sides', 'Mic Switch Sides') },
  { id: 'eb-gogo-release', name: 'EB Gogo Release', category: 'releases', level: 'hard',
    description: 'From an EB (front-back cross), release the back handle and catch it again in a cross (also called EB to Cross Floater).',
    challenge: 'Releasing and catching while one arm is behind your back.',
    video: tt('eb-gogo-release', 'eb-to-cross-floater', 'EB to Cross Floater') },
  { id: 'lasso-release', name: 'Lasso Release', category: 'releases', level: 'epic',
    description: 'Release one handle and spin the rope twice above your head like a lasso, then catch the handle (also called Snake Above Head).',
    challenge: 'Keeping the rope spinning in the air and catching it cleanly without stopping the routine.',
    video: tt('lasso-release', 'snake-above-head', 'Snake Above Head') },

  // Multiples
  { id: 'double-under', name: 'Double Under', category: 'multiples', level: 'easy',
    description: 'The rope passes under your feet twice in a single jump.',
    challenge: 'Fast wrists and a slightly higher jump.',
    video: tt('double-under', 'double-under', 'Double Under') },
  { id: 'backwards-double-under', name: 'Backwards Double Under', category: 'multiples', level: 'medium',
    description: 'The rope passes under your feet twice in one jump, swinging backwards.',
    challenge: 'Timing a fast backward swing you cannot see coming.',
    video: tt('backwards-double-under', 'backwards-double-under', 'Backwards Double Under') },
  { id: 'triple-under', name: 'Triple Under', category: 'multiples', level: 'rare',
    description: 'The rope passes under your feet three times in a single jump.',
    challenge: 'A much higher jump and very fast, compact rope turns.',
    video: tt('triple-under', 'triple-under', 'Triple Under') },
  { id: 'double-under-cross', name: 'Double Under Cross', category: 'multiples', level: 'hard',
    description: 'A double under where one of the two rope rotations is a cross.',
    challenge: 'Crossing and uncrossing the arms at speed within one jump.',
    video: tt('double-under-cross', 'double-under-cross-open', 'Double Under Cross Open') },
  { id: 'quadruple-under', name: 'Quadruple Under', category: 'multiples', level: 'epic',
    description: 'The rope passes under your feet four times in a single jump.',
    challenge: 'Elite jump height and wrist speed, with almost no margin for timing errors.',
    video: tt('quadruple-under', 'quadruple-under', 'Quadruple Under') },
]
