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
  videoUrl?: string // set when a real tutorial exists; until then the trick page shows a placeholder
}

export const TRICKS: Trick[] = [
  // Footwork
  { id: 'jogging-step', name: 'Jogging Step', category: 'footwork', level: 'easy',
    description: 'Alternate feet on every rope turn, as if jogging in place.',
    challenge: 'Keeping an even rhythm so each turn lands on exactly one foot.' },
  { id: 'side-straddle', name: 'Side Straddle', category: 'footwork', level: 'medium',
    description: 'Jump the feet apart to the sides, then back together, on alternating turns.',
    challenge: 'Timing the open and close with the rope and landing softly with the feet wide.' },
  { id: 'skier', name: 'Skier', category: 'footwork', level: 'rare',
    description: 'Hop with both feet together from side to side, like a skier.',
    challenge: 'Moving sideways on every jump without drifting or losing the timing.' },
  { id: 'bell', name: 'Bell', category: 'footwork', level: 'hard',
    description: 'Hop with both feet together forward and back, like a swinging bell.',
    challenge: 'The forward–back travel keeps shifting your balance while the rope keeps turning.' },
  { id: 'can-can', name: 'Can-Can', category: 'footwork', level: 'epic',
    description: 'A four-count pattern: knee lift, feet together, kick, feet together, then switch legs.',
    challenge: 'Coordinating a multi-count leg pattern on one leg at a time without breaking rhythm.' },

  // Rope Manipulation
  { id: 'side-swing', name: 'Side Swing', category: 'rope', level: 'easy',
    description: 'Swing the rope beside your body with both hands together, then open back into a jump.',
    challenge: 'Keeping the swing flat and even, and opening out of it at the right moment.' },
  { id: 'criss-cross', name: 'Criss-Cross', category: 'rope', level: 'medium',
    description: 'Cross your arms in front of the body and jump through the crossed loop, then uncross.',
    challenge: 'Crossing deep enough at the waist so the loop is big enough to jump through.' },
  { id: 'toad', name: 'Toad', category: 'rope', level: 'rare',
    description: 'One arm crosses in front of the body and under the opposite raised leg.',
    challenge: 'The arm under the leg makes the loop small: you need a high leg lift and precise timing.' },
  { id: 'eb', name: 'EB (Front-Back Cross)', category: 'rope', level: 'hard',
    description: 'One arm crosses in front of the body while the other crosses behind the back.',
    challenge: 'Arms work on opposite sides of the body, which needs shoulder mobility and a symmetric loop.' },
  { id: 'as-switch-cross', name: 'AS Switch Cross', category: 'rope', level: 'epic',
    description: 'A cross with both arms behind the back (the AS position), switching the arms between jumps.',
    challenge: 'You cannot see your hands, and the switch behind the back must happen inside one rope turn.' },

  // Power
  { id: 'mountain-climber', name: 'Mountain Climber', category: 'power', level: 'easy',
    description: 'A ground element from a plank position with alternating knee drives, timed with the rope.',
    challenge: 'Holding a solid plank while keeping the rope timing.' },
  { id: 'butt-bounce', name: 'Butt Bounce', category: 'power', level: 'medium',
    description: 'Drop to a seated position and bounce back up to your feet while the rope passes under.',
    challenge: 'Getting back up in a single rope turn using legs and core.' },
  { id: 'frog', name: 'Frog', category: 'power', level: 'rare',
    description: 'Place your hands on the floor and kick the legs up so the rope passes under hands and feet.',
    challenge: 'Supporting your body weight on your hands with control.' },
  { id: 'push-up-cross', name: 'Push-up Cross', category: 'power', level: 'hard',
    description: 'A push-up element where the rope passes under the body with the arms crossed.',
    challenge: 'Combining upper-body strength with a cross while close to the floor.' },
  { id: 'frog-cross', name: 'Frog Cross', category: 'power', level: 'epic',
    description: 'A frog performed with the arms crossed.',
    challenge: 'Holding an inverted position on crossed arms while the rope passes under.' },

  // Releases
  { id: 'basic-release', name: 'Basic Release', category: 'releases', level: 'easy',
    description: 'Let go of one handle during a swing, let the rope travel, then catch the handle again.',
    challenge: 'Releasing at the right point so the handle comes back to your hand.' },
  { id: 'micro-release', name: 'Micro Release', category: 'releases', level: 'medium',
    description: 'A small, quick release where the handle is regained almost immediately.',
    challenge: 'Very short timing window and precise hand control.' },
  { id: 'mamba-release', name: 'Mamba Release', category: 'releases', level: 'rare',
    description: 'A release in which the free end of the rope travels in a whipping, snake-like path before the catch.',
    challenge: 'Controlling the path of the free handle so it returns to a catchable spot.' },
  { id: 'eb-gogo-release', name: 'EB Gogo Release', category: 'releases', level: 'hard',
    description: 'A release performed from the EB (front-back cross) position, then the handle is regained.',
    challenge: 'Releasing and catching while one arm is behind your back.' },
  { id: 'lasso-release', name: 'Lasso Release', category: 'releases', level: 'epic',
    description: 'Release the rope, spin it overhead like a lasso, then catch the handle and continue.',
    challenge: 'Keeping the rope spinning in the air and catching it cleanly without stopping the routine.' },

  // Multiples
  { id: 'double-under', name: 'Double Under', category: 'multiples', level: 'easy',
    description: 'The rope passes under your feet twice in a single jump.',
    challenge: 'Fast wrists and a slightly higher jump.' },
  { id: 'consecutive-double-unders', name: 'Consecutive Double Unders', category: 'multiples', level: 'medium',
    description: 'Double unders back to back, with no single jumps in between.',
    challenge: 'Keeping the height and wrist speed on every jump without a rest bounce.' },
  { id: 'triple-under', name: 'Triple Under', category: 'multiples', level: 'rare',
    description: 'The rope passes under your feet three times in a single jump.',
    challenge: 'A much higher jump and very fast, compact rope turns.' },
  { id: 'double-under-cross', name: 'Double Under Cross', category: 'multiples', level: 'hard',
    description: 'A double under where one of the two rope rotations is a cross.',
    challenge: 'Crossing and uncrossing the arms at speed within one jump.' },
  { id: 'quadruple-under', name: 'Quadruple Under', category: 'multiples', level: 'epic',
    description: 'The rope passes under your feet four times in a single jump.',
    challenge: 'Elite jump height and wrist speed, with almost no margin for timing errors.' },
]
