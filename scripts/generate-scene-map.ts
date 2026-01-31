/**
 * Generate comprehensive scene map for analysis
 */
import fs from 'fs';
import path from 'path';

const COMPOSITE_DIR = 'scenes/v2/composite';
const ONBOARDING_DIR = 'scenes/v2/onboarding';

// Gate requirements from onboarding-gates.ts (copied for standalone script)
interface GateRequirement {
  gates: string[];
  operator: 'AND' | 'OR';
  level?: 'basic' | 'very';
}

const SCENE_GATES: Record<string, GateRequirement> = {
  // ORAL
  blowjob: { gates: ['oral'], operator: 'AND' },
  cunnilingus: { gates: ['oral'], operator: 'AND' },
  deepthroat: { gates: ['oral'], operator: 'AND' },
  'facesitting-she-on-him': { gates: ['oral'], operator: 'AND' },
  'facesitting-he-on-her': { gates: ['oral'], operator: 'AND' },
  'rimming-m-to-f': { gates: ['oral', 'anal'], operator: 'AND' },
  'rimming-f-to-m': { gates: ['oral', 'anal'], operator: 'AND' },
  'cock-worship': { gates: ['oral'], operator: 'AND' },
  'pussy-worship': { gates: ['oral'], operator: 'AND' },

  // ANAL
  'anal-play-on-her': { gates: ['anal'], operator: 'AND' },
  'anal-play-on-him': { gates: ['anal'], operator: 'AND' },
  pegging: { gates: ['anal'], operator: 'AND' },  // removed bondage - pegging is about anal, not bondage
  'butt-plug': { gates: ['anal', 'toys'], operator: 'OR' },
  'anal-hook': { gates: ['anal', 'bondage'], operator: 'AND' },
  figging: { gates: ['anal', 'rough'], operator: 'AND' },
  'anal-sex-give': { gates: ['anal'], operator: 'AND' },  // NEW: anal penetration
  'anal-sex-receive': { gates: ['anal'], operator: 'AND' },  // NEW: anal penetration

  // BODY FLUIDS - REMOVED: squirting, golden-shower, spitting are independent fetishes
  // They don't need gates, should use clarification_for instead
  // - squirting: shows as clarification to cunnilingus/vibrator-play
  // - golden-shower, spitting: independent fetishes, show to everyone
  // - breeding-kink: independent fetish

  // WORSHIP - REMOVED: these are basic/independent scenes
  // - body-worship: shows as clarification to massage
  // - foot-worship: independent fetish, show to everyone

  // IMPACT/PAIN
  'spanking-he-spanks-her': { gates: ['rough'], operator: 'AND' },
  'spanking-she-spanks-him': { gates: ['rough'], operator: 'AND' },
  'choking-he-chokes-her': { gates: ['rough'], operator: 'AND' },
  'choking-she-chokes-him': { gates: ['rough'], operator: 'AND' },
  'face-slapping-he-slaps-her': { gates: ['rough'], operator: 'AND', level: 'very' },
  'face-slapping-she-slaps-him': { gates: ['rough'], operator: 'AND', level: 'very' },
  'whipping-m-to-f': { gates: ['rough', 'bondage'], operator: 'AND' },
  'whipping-f-to-m': { gates: ['rough', 'bondage'], operator: 'AND' },
  'wax-play-he-on-her': { gates: ['rough', 'toys'], operator: 'OR' },
  'wax-play-she-on-him': { gates: ['rough', 'toys'], operator: 'OR' },
  'nipple-play-he-on-her': { gates: ['rough'], operator: 'AND' },
  'nipple-play-she-on-him': { gates: ['rough'], operator: 'AND' },
  'nipple-clamps': { gates: ['toys', 'rough'], operator: 'AND' },
  cbt: { gates: ['rough', 'bondage'], operator: 'AND' },

  // VERBAL
  'dirty-talk': { gates: ['dirty_talk'], operator: 'AND' },
  'degradation-m-to-f': { gates: ['dirty_talk', 'rough'], operator: 'AND' },
  'degradation-f-to-m': { gates: ['dirty_talk', 'rough'], operator: 'AND' },
  'praise-he-praises-her': { gates: ['praise'], operator: 'AND' },
  'praise-she-praises-him': { gates: ['praise'], operator: 'AND' },
  'moaning-and-screaming': { gates: ['dirty_talk'], operator: 'AND' },

  // CONTROL/POWER
  'bondage-he-ties-her': { gates: ['bondage'], operator: 'AND' },
  'bondage-she-ties-him': { gates: ['bondage'], operator: 'AND' },
  'bondage-shibari': { gates: ['bondage'], operator: 'AND' },
  'bondage-restraint': { gates: ['bondage'], operator: 'AND' },
  'bondage-spreader-bar': { gates: ['bondage'], operator: 'AND' },
  'bondage-chains': { gates: ['bondage'], operator: 'AND' },
  'bondage-st-andrews-cross': { gates: ['bondage'], operator: 'AND' },  // NEW
  'bondage-suspension': { gates: ['bondage'], operator: 'AND', level: 'very' },  // NEW - extreme
  blindfold: { gates: ['bondage'], operator: 'AND' },
  'collar-he-owns-her': { gates: ['bondage'], operator: 'AND' },
  'collar-she-owns-him': { gates: ['bondage'], operator: 'AND' },
  'edging-he-controls-her': { gates: ['bondage'], operator: 'AND' },
  'edging-she-controls-him': { gates: ['bondage'], operator: 'AND' },
  'forced-orgasm-on-her': { gates: ['bondage'], operator: 'AND' },
  'forced-orgasm-on-him': { gates: ['bondage'], operator: 'AND' },
  'orgasm-control': { gates: ['bondage'], operator: 'AND' },
  'ruined-orgasm-m-to-f': { gates: ['bondage'], operator: 'AND' },
  'ruined-orgasm-f-to-m': { gates: ['bondage'], operator: 'AND' },
  'free-use-f-available': { gates: ['bondage'], operator: 'AND' },
  'free-use-m-available': { gates: ['bondage'], operator: 'AND' },
  'sex-tasks': { gates: ['bondage', 'dirty_talk'], operator: 'OR' },
  'chastity-m-locked': { gates: ['bondage'], operator: 'AND' },
  'chastity-f-locked': { gates: ['bondage'], operator: 'AND' },

  // CNC/ROUGH - just rough, not bondage
  'cnc-he-takes-her': { gates: ['rough'], operator: 'AND', level: 'very' },
  'cnc-she-takes-him': { gates: ['rough'], operator: 'AND', level: 'very' },
  primal: { gates: ['rough'], operator: 'AND' },
  'somnophilia-m-to-f': { gates: ['bondage'], operator: 'AND', level: 'very' },
  'somnophilia-f-to-m': { gates: ['bondage'], operator: 'AND', level: 'very' },

  // EXTREME - just rough, not bondage
  'breath-play-m-to-f': { gates: ['rough'], operator: 'AND', level: 'very' },
  'breath-play-f-to-m': { gates: ['rough'], operator: 'AND', level: 'very' },
  'knife-play-m-to-f': { gates: ['rough'], operator: 'AND', level: 'very' },
  'knife-play-f-to-m': { gates: ['rough'], operator: 'AND', level: 'very' },
  'mummification-f': { gates: ['bondage'], operator: 'AND', level: 'very' },
  'mummification-m': { gates: ['bondage'], operator: 'AND', level: 'very' },
  'needle-play-m-to-f': { gates: ['rough'], operator: 'AND', level: 'very' },
  'needle-play-f-to-m': { gates: ['rough'], operator: 'AND', level: 'very' },
  'objectification-f': { gates: ['bondage'], operator: 'AND', level: 'very' },
  'objectification-m': { gates: ['bondage'], operator: 'AND', level: 'very' },
  'feminization-do': { gates: ['bondage'], operator: 'AND' },
  'feminization-wear': { gates: ['bondage'], operator: 'AND' },
  'fisting-anal-m-to-f': { gates: ['anal'], operator: 'AND', level: 'very' },
  'fisting-anal-f-to-m': { gates: ['anal'], operator: 'AND', level: 'very' },
  'fisting-vaginal-m-to-f': { gates: ['rough'], operator: 'AND', level: 'very' },  // fisting is not toys, it's extreme rough
  'fucking-machine': { gates: ['toys'], operator: 'AND' },
  electrostim: { gates: ['toys'], operator: 'AND' },
  // lactation - REMOVED: independent fetish, no gate needed

  // GROUP
  'threesome-fmf': { gates: ['group'], operator: 'AND' },
  'threesome-mfm': { gates: ['group'], operator: 'AND' },
  gangbang: { gates: ['group'], operator: 'AND', level: 'very' },
  orgy: { gates: ['group'], operator: 'AND', level: 'very' },
  swinging: { gates: ['group'], operator: 'AND' },
  'double-penetration': { gates: ['group', 'anal'], operator: 'AND' },
  cuckold: { gates: ['group'], operator: 'AND' },  // removed bondage - cuckold is about group dynamics
  'cuckold-watch': { gates: ['group'], operator: 'AND' },  // NEW
  'cuckold-play': { gates: ['group'], operator: 'AND' },  // NEW
  hotwife: { gates: ['group'], operator: 'AND' },
  'hotwife-stag': { gates: ['group'], operator: 'AND' },  // NEW
  'hotwife-vixen-f': { gates: ['group'], operator: 'AND' },  // NEW

  // EXHIBITIONISM
  exhibitionism: { gates: ['exhibitionism'], operator: 'AND' },
  voyeurism: { gates: ['exhibitionism'], operator: 'AND' },
  'public-sex': { gates: ['exhibitionism'], operator: 'AND' },
  'glory-hole-f-gives': { gates: ['exhibitionism', 'oral'], operator: 'AND' },
  'glory-hole-m-gives': { gates: ['exhibitionism', 'oral'], operator: 'AND' },
  'striptease-f': { gates: ['exhibitionism'], operator: 'AND' },
  'striptease-m': { gates: ['exhibitionism'], operator: 'AND' },
  'no-panties-walk': { gates: ['exhibitionism'], operator: 'AND' },
  'dress-code': { gates: ['exhibitionism', 'lingerie'], operator: 'AND' },

  // ROLEPLAY
  'boss-m-secretary-f': { gates: ['roleplay'], operator: 'AND' },
  'boss-f-subordinate-m': { gates: ['roleplay'], operator: 'AND' },
  'teacher-m-student-f': { gates: ['roleplay'], operator: 'AND' },
  'teacher-f-student-m': { gates: ['roleplay'], operator: 'AND' },
  'doctor-patient': { gates: ['roleplay'], operator: 'AND' },
  'stranger-roleplay': { gates: ['roleplay'], operator: 'AND' },
  'service-roleplay': { gates: ['roleplay'], operator: 'AND' },  // removed bondage - service can be without bondage
  'taboo-roleplay': { gates: ['roleplay'], operator: 'AND', level: 'very' },
  'truth-or-dare': { gates: ['roleplay'], operator: 'AND' },
  'uniforms-f': { gates: ['roleplay', 'lingerie'], operator: 'AND' },
  'uniforms-m': { gates: ['roleplay', 'lingerie'], operator: 'AND' },

  // PET/AGE PLAY
  'pet-play-f-is-pet': { gates: ['roleplay', 'bondage'], operator: 'AND' },
  'pet-play-m-is-pet': { gates: ['roleplay', 'bondage'], operator: 'AND' },
  'ddlg-daddy': { gates: ['roleplay', 'bondage'], operator: 'AND' },
  'ddlg-little-girl': { gates: ['roleplay', 'bondage'], operator: 'AND' },
  'mdlb-mommy': { gates: ['roleplay', 'bondage'], operator: 'AND' },
  'mdlb-little-boy': { gates: ['roleplay', 'bondage'], operator: 'AND' },

  // TOYS
  'vibrator-play': { gates: ['toys'], operator: 'AND' },
  'dildo': { gates: ['toys'], operator: 'AND' },
  'cock-ring': { gates: ['toys'], operator: 'AND' },
  'remote-control': { gates: ['toys'], operator: 'AND' },  // removed exhibitionism - can use at home
  'toy-wand': { gates: ['toys'], operator: 'AND' },
  'toy-beads': { gates: ['toys', 'anal'], operator: 'AND' },
  'toy-clitoral': { gates: ['toys'], operator: 'AND' },
  'toy-plug-small': { gates: ['toys', 'anal'], operator: 'AND' },
  'toy-plug-large': { gates: ['toys', 'anal'], operator: 'AND' },

  // CLOTHING
  'lingerie-lace': { gates: ['lingerie'], operator: 'AND' },
  'lingerie-fishnet': { gates: ['lingerie'], operator: 'AND' },
  'lingerie-sheer': { gates: ['lingerie'], operator: 'AND' },
  'lingerie-satin': { gates: ['lingerie'], operator: 'AND' },
  'lingerie-corset': { gates: ['lingerie'], operator: 'AND' },
  stockings: { gates: ['lingerie'], operator: 'AND' },
  'heels-only': { gates: ['lingerie'], operator: 'AND' },
  'harness-f': { gates: ['lingerie'], operator: 'AND' },  // removed bondage - harness is clothing
  'harness-m': { gates: ['lingerie'], operator: 'AND' },  // removed bondage - harness is clothing
  'latex-leather': { gates: ['lingerie'], operator: 'AND' },
  'torn-clothes': { gates: ['rough'], operator: 'AND' },

  // FILMING
  filming: { gates: ['recording'], operator: 'AND' },
  sexting: { gates: ['recording'], operator: 'AND' },
  'video-sex': { gates: ['recording'], operator: 'AND' },
  'voice-instructions': { gates: ['recording', 'dirty_talk'], operator: 'AND' },

  // ROMANTIC/CONTEXT - REMOVED: these are basic scenes, shown to everyone
  // - aftercare: shown after any rough scene
  // - massage: basic scene, no gate needed
  // - body-worship: shown as clarification to massage
};

// Helper to get gate requirement for a scene (tries base slug without -receive suffix)
function getGateReq(slug: string): GateRequirement | null {
  if (SCENE_GATES[slug]) return SCENE_GATES[slug];
  // Try without -receive suffix
  const base = slug.replace(/-receive$/, '');
  if (SCENE_GATES[base]) return SCENE_GATES[base];
  return null;
}

interface Scene {
  slug: string;
  title?: { ru?: string; en?: string };
  is_active?: boolean;
  for_gender?: string | null;
  scene_type?: string;
  clarification_for?: string[];
  paired_scene?: string;
  category?: string;
  intensity?: number;
  tags?: string[];
  is_onboarding?: boolean;
}

interface SceneInfo {
  slug: string;
  title: string;
  category: string;
  forGender: string;
  sceneType: string;
  clarificationFor: string[];
  pairedScene: string;
  intensity: number;
  isActive: boolean;
  tags: string[];
  isOnboarding: boolean;
  onboardingOrder: number;
  setsGate: string;
  requiresGates: string[];
  gateOperator: string;
  gateLevel: string;
}

function getAllJsonFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  function scanDir(currentDir: string) {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(currentDir, item.name);
      if (item.isDirectory()) {
        scanDir(fullPath);
      } else if (item.name.endsWith('.json') && item.name !== '_index.json') {
        files.push(fullPath);
      }
    }
  }
  scanDir(dir);
  return files;
}

// Load all composite scenes
const compositeFiles = getAllJsonFiles(COMPOSITE_DIR);
const scenes: SceneInfo[] = [];
const byCategory = new Map<string, SceneInfo[]>();

for (const filePath of compositeFiles) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const scene = JSON.parse(content) as Scene;
    const relPath = path.relative(COMPOSITE_DIR, filePath);
    const category = relPath.split(path.sep)[0];

    const slug = scene.slug || path.basename(filePath, '.json');
    const gateReq = getGateReq(slug);

    const info: SceneInfo = {
      slug,
      title: scene.title?.ru || scene.title?.en || '',
      category,
      forGender: scene.for_gender || 'null',
      sceneType: scene.scene_type || 'swipe',
      clarificationFor: scene.clarification_for || [],
      pairedScene: scene.paired_scene || '',
      intensity: scene.intensity || 1,
      isActive: scene.is_active !== false,
      tags: scene.tags || [],
      isOnboarding: (scene as any).is_onboarding === true,
      onboardingOrder: (scene as any).onboarding_order || 0,
      setsGate: (scene as any).sets_gate || '',
      requiresGates: gateReq?.gates || [],
      gateOperator: gateReq?.operator || '',
      gateLevel: gateReq?.level || '',
    };

    scenes.push(info);

    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push(info);
  } catch (e) {
    console.error(`Failed to parse ${filePath}`);
  }
}

// Load onboarding scenes
const onboardingFiles = getAllJsonFiles(ONBOARDING_DIR);
const onboardingScenes: SceneInfo[] = [];

for (const filePath of onboardingFiles) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const scene = JSON.parse(content) as Scene;

    onboardingScenes.push({
      slug: scene.slug || path.basename(filePath, '.json'),
      title: scene.title?.ru || scene.title?.en || '',
      category: 'onboarding',
      forGender: scene.for_gender || 'null',
      sceneType: scene.scene_type || 'swipe',
      clarificationFor: [],
      pairedScene: scene.paired_scene || '',
      intensity: scene.intensity || 1,
      isActive: scene.is_active !== false,
      tags: scene.tags || [],
    });
  } catch (e) {
    console.error(`Failed to parse ${filePath}`);
  }
}

// Output
console.log('# КАРТА СЦЕН\n');
console.log(`Всего composite сцен: ${scenes.length}`);
console.log(`Активных: ${scenes.filter(s => s.isActive).length}`);
console.log(`Неактивных: ${scenes.filter(s => !s.isActive).length}`);
console.log(`Категорий: ${byCategory.size}`);
console.log(`Онбординг сцен: ${scenes.filter(s => s.isOnboarding).length}\n`);

console.log('## ЛЕГЕНДА\n');
console.log('```');
console.log('♂/♀/⚥   — for_gender: male/female/null');
console.log('↔       — paired_scene (парная сцена)');
console.log('←       — clarification_for (после какой сцены показать)');
console.log('🔓oral  — sets_gate (открывает гейт при YES)');
console.log('🔒[x&y] — requires gates (AND)');
console.log('🔒[x|y] — requires gates (OR)');
console.log('🔒![x]  — requires gates (level: very)');
console.log('');
console.log('Показаны только АКТИВНЫЕ сцены. Неактивные в конце файла.');
console.log('```\n');

// Categories
console.log('## КАТЕГОРИИ\n');
const sortedCategories = [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length);

for (const [cat, catScenes] of sortedCategories) {
  const active = catScenes.filter(s => s.isActive);
  if (active.length === 0) continue; // Skip categories with no active scenes
  console.log(`### ${cat} (${active.length} сцен)\n`);

  // Only show active scenes (inactive ones are in archive)
  for (const scene of active.sort((a, b) => a.slug.localeCompare(b.slug))) {
    const gender = scene.forGender === 'male' ? '♂' : scene.forGender === 'female' ? '♀' : '⚥';
    const paired = scene.pairedScene ? ` ↔ ${scene.pairedScene}` : '';
    const clarFor = scene.clarificationFor.length > 0 ? ` ← [${scene.clarificationFor.join(', ')}]` : '';

    // Sets gate (for onboarding scenes)
    const setsGateStr = scene.setsGate ? ` 🔓${scene.setsGate}` : '';

    // Gate requirements (only show if scene doesn't SET a gate - otherwise it's circular)
    let requiresStr = '';
    if (scene.requiresGates.length > 0 && !scene.setsGate) {
      const op = scene.gateOperator === 'OR' ? '|' : '&';
      const level = scene.gateLevel === 'very' ? '!' : '';
      requiresStr = ` 🔒${level}[${scene.requiresGates.join(op)}]`;
    }

    console.log(`${gender} ${scene.slug}${paired}${setsGateStr}${requiresStr}${clarFor}`);
  }
  console.log('');
}

// New onboarding scenes (is_onboarding: true)
console.log('## ОНБОРДИНГ СЦЕНЫ (is_onboarding: true)\n');
const newOnboarding = scenes.filter(s => s.isOnboarding && s.isActive).sort((a, b) => a.onboardingOrder - b.onboardingOrder);
console.log(`Всего: ${newOnboarding.length}\n`);
console.log('| # | Slug | Gate | Gender | Title |');
console.log('|---|------|------|--------|-------|');
for (const scene of newOnboarding) {
  const gender = scene.forGender === 'male' ? '♂' : scene.forGender === 'female' ? '♀' : '⚥';
  console.log(`| ${scene.onboardingOrder} | ${scene.slug} | ${scene.setsGate} | ${gender} | ${scene.title} |`);
}
console.log('');


// Old onboarding scenes (for reference)
console.log('## СТАРЫЙ ОНБОРДИНГ (архив)\n');
for (const scene of onboardingScenes.filter(s => s.isActive).slice(0, 5)) {
  console.log(`- ${scene.slug}: "${scene.title}"`);
}
if (onboardingScenes.filter(s => s.isActive).length > 5) {
  console.log(`... и ещё ${onboardingScenes.filter(s => s.isActive).length - 5}`);
}
console.log('');

// Clarification analysis
console.log('## CLARIFICATION АНАЛИЗ\n');

const clarifiedBy = new Map<string, string[]>();
for (const scene of scenes.filter(s => s.isActive)) {
  for (const parent of scene.clarificationFor) {
    if (!clarifiedBy.has(parent)) {
      clarifiedBy.set(parent, []);
    }
    clarifiedBy.get(parent)!.push(scene.slug);
  }
}

const sortedParents = [...clarifiedBy.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [parent, children] of sortedParents.slice(0, 20)) {
  console.log(`### ${parent} (${children.length} clarifications)`);
  for (const child of children.slice(0, 10)) {
    console.log(`  - ${child}`);
  }
  if (children.length > 10) {
    console.log(`  ... и ещё ${children.length - 10}`);
  }
  console.log('');
}

// Scenes without clarification_for
console.log('## СЦЕНЫ БЕЗ CLARIFICATION_FOR (потенциальные main questions)\n');
const noClarification = scenes.filter(s => s.isActive && s.clarificationFor.length === 0);
for (const scene of noClarification) {
  console.log(`- ${scene.category}/${scene.slug}: "${scene.title}"`);
}
console.log('');

// Gates analysis
console.log('## ГЕЙТЫ И СЦЕНЫ\n');

const gateToScenes = new Map<string, string[]>();
for (const scene of scenes.filter(s => s.isActive)) {
  for (const gate of scene.requiresGates) {
    if (!gateToScenes.has(gate)) {
      gateToScenes.set(gate, []);
    }
    gateToScenes.get(gate)!.push(scene.slug);
  }
}

const sortedGates = [...gateToScenes.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [gate, gateScenes] of sortedGates) {
  console.log(`### ${gate} (${gateScenes.length} сцен)`);
  console.log(gateScenes.slice(0, 10).map(s => `  - ${s}`).join('\n'));
  if (gateScenes.length > 10) {
    console.log(`  ... и ещё ${gateScenes.length - 10}`);
  }
  console.log('');
}

// Scenes without gates
console.log('## СЦЕНЫ БЕЗ ГЕЙТОВ (показываются всем)\n');
const noGates = scenes.filter(s => s.isActive && s.requiresGates.length === 0);
console.log(`Всего: ${noGates.length}\n`);
for (const scene of noGates.slice(0, 30)) {
  console.log(`- ${scene.category}/${scene.slug}`);
}
if (noGates.length > 30) {
  console.log(`... и ещё ${noGates.length - 30}`);
}
console.log('');

// All unique slugs for reference (active only)
console.log('## ВСЕ SLUG-и (для поиска)\n');
const allSlugs = scenes.filter(s => s.isActive).map(s => s.slug).sort();
console.log(allSlugs.join('\n'));

// Archived/inactive scenes
const inactiveScenes = scenes.filter(s => !s.isActive);
if (inactiveScenes.length > 0) {
  console.log('\n\n## АРХИВ (неактивные сцены)\n');
  console.log(`Всего: ${inactiveScenes.length}\n`);
  for (const scene of inactiveScenes.sort((a, b) => a.slug.localeCompare(b.slug))) {
    console.log(`- ${scene.category}/${scene.slug}`);
  }
}
