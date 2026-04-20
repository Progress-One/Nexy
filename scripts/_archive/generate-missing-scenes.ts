/**
 * Generate missing scenes based on the UI requirements
 *
 * Run: npx tsx scripts/generate-missing-scenes.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const OUTPUT_BASE = path.join(__dirname, '..', 'scenes', 'v2', 'composite');

function uuid(): string {
  return crypto.randomUUID();
}

interface SceneTemplate {
  slug: string;
  category: string;
  folder: string;
  title: { ru: string; en: string };
  subtitle?: { ru: string; en: string };
  user_description: { ru: string; en: string };
  image_prompt: string;
  intensity: number;
  tags: string[];
  role_direction: string;
  for_gender: 'male' | 'female' | null;
  paired_with?: string;
  clarification_for?: string[];
}

function createScene(template: SceneTemplate): object {
  return {
    id: uuid(),
    slug: template.slug,
    version: 2,
    is_active: true,
    is_onboarding: false,
    role_direction: template.role_direction,
    for_gender: template.for_gender,
    paired_with: template.paired_with || null,
    clarification_for: template.clarification_for || [],
    title: template.title,
    subtitle: template.subtitle || { ru: '', en: '' },
    ai_description: template.user_description,
    user_description: template.user_description,
    image_prompt: template.image_prompt,
    intensity: template.intensity,
    category: template.category,
    tags: template.tags,
    priority: 50,
    elements: [],
    question: null,
    ai_context: {
      tests_primary: template.tags.slice(0, 2),
      tests_secondary: [],
    },
  };
}

// ============================================
// SCENE DEFINITIONS
// ============================================

const scenes: SceneTemplate[] = [
  // === BONDAGE TYPES (6) ===
  {
    slug: 'bondage-shibari',
    category: 'bondage',
    folder: 'bondage-types',
    title: { ru: 'Шибари', en: 'Shibari' },
    subtitle: { ru: 'Японское верёвочное искусство', en: 'Japanese rope art' },
    user_description: { ru: 'Красивые узоры из верёвок на теле. Эстетика и ограничение движений.', en: 'Beautiful rope patterns on the body. Aesthetics and restriction.' },
    image_prompt: 'person with decorative rope bondage shibari pattern on torso, artistic japanese rope work, bedroom',
    intensity: 3,
    tags: ['bondage', 'shibari', 'rope'],
    role_direction: 'mutual',
    for_gender: null,
    clarification_for: ['bondage-give', 'bondage-receive'],
  },
  {
    slug: 'bondage-restraint',
    category: 'bondage',
    folder: 'bondage-types',
    title: { ru: 'Фиксация', en: 'Restraint' },
    subtitle: { ru: 'Наручники, ремни, липучки', en: 'Cuffs, straps, velcro' },
    user_description: { ru: 'Простая фиксация рук или ног. Наручники, ремни или мягкие путы.', en: 'Simple hand or leg restraint. Cuffs, straps, or soft bonds.' },
    image_prompt: 'hands bound with soft leather cuffs attached to bedpost, bedroom setting',
    intensity: 2,
    tags: ['bondage', 'restraint', 'cuffs'],
    role_direction: 'mutual',
    for_gender: null,
    clarification_for: ['bondage-give', 'bondage-receive'],
  },
  {
    slug: 'bondage-st-andrews-cross',
    category: 'bondage',
    folder: 'bondage-types',
    title: { ru: 'Андреевский крест', en: "St. Andrew's Cross" },
    subtitle: { ru: 'X-образная рама', en: 'X-shaped frame' },
    user_description: { ru: 'Фиксация на X-образной раме. Руки и ноги разведены в стороны.', en: 'Fixed to an X-shaped frame. Arms and legs spread wide.' },
    image_prompt: 'person standing against wooden X-shaped st andrews cross frame, arms spread, dungeon setting',
    intensity: 4,
    tags: ['bondage', 'st-andrews-cross', 'furniture'],
    role_direction: 'mutual',
    for_gender: null,
    clarification_for: ['bondage-give', 'bondage-receive'],
  },
  {
    slug: 'bondage-spreader-bar',
    category: 'bondage',
    folder: 'bondage-types',
    title: { ru: 'Распорка', en: 'Spreader Bar' },
    subtitle: { ru: 'Ноги или руки разведены', en: 'Legs or arms spread apart' },
    user_description: { ru: 'Металлическая или деревянная перекладина, держащая ноги или руки разведёнными.', en: 'Metal or wooden bar keeping legs or arms spread apart.' },
    image_prompt: 'legs held apart by metal spreader bar with ankle cuffs, bedroom',
    intensity: 3,
    tags: ['bondage', 'spreader-bar', 'restraint'],
    role_direction: 'mutual',
    for_gender: null,
    clarification_for: ['bondage-give', 'bondage-receive'],
  },
  {
    slug: 'bondage-suspension',
    category: 'bondage',
    folder: 'bondage-types',
    title: { ru: 'Подвешивание', en: 'Suspension' },
    subtitle: { ru: 'Частичное или полное', en: 'Partial or full' },
    user_description: { ru: 'Подвешивание тела на верёвках или ремнях. От лёгкого до полного отрыва от пола.', en: 'Body suspended on ropes or straps. From light to full suspension.' },
    image_prompt: 'person partially suspended by rope harness, feet barely touching floor, dim lighting',
    intensity: 5,
    tags: ['bondage', 'suspension', 'advanced'],
    role_direction: 'mutual',
    for_gender: null,
    clarification_for: ['bondage-give', 'bondage-receive'],
  },
  {
    slug: 'bondage-chains',
    category: 'bondage',
    folder: 'bondage-types',
    title: { ru: 'Цепи', en: 'Chains' },
    subtitle: { ru: 'Металлические оковы', en: 'Metal shackles' },
    user_description: { ru: 'Холодный металл цепей на запястьях или лодыжках. Звон при каждом движении.', en: 'Cold metal chains on wrists or ankles. Clinking with every movement.' },
    image_prompt: 'wrists bound by metal chains attached to wall, dungeon atmosphere',
    intensity: 4,
    tags: ['bondage', 'chains', 'metal'],
    role_direction: 'mutual',
    for_gender: null,
    clarification_for: ['bondage-give', 'bondage-receive'],
  },

  // === POSITIONS (8) ===
  {
    slug: 'position-missionary',
    category: 'positions',
    folder: 'positions',
    title: { ru: 'Миссионерская', en: 'Missionary' },
    user_description: { ru: 'Лицом к лицу, он сверху. Классика, позволяющая целоваться и смотреть в глаза.', en: 'Face to face, him on top. Classic position for kissing and eye contact.' },
    image_prompt: 'couple in missionary position on bed, man on top, intimate eye contact, bedroom',
    intensity: 1,
    tags: ['positions', 'missionary', 'vanilla'],
    role_direction: 'mutual',
    for_gender: null,
  },
  {
    slug: 'position-doggy',
    category: 'positions',
    folder: 'positions',
    title: { ru: 'Догги-стайл', en: 'Doggy Style' },
    user_description: { ru: 'Она на четвереньках, он сзади. Глубокое проникновение и контроль.', en: 'She on all fours, him behind. Deep penetration and control.' },
    image_prompt: 'woman on hands and knees on bed, man kneeling behind her, bedroom',
    intensity: 2,
    tags: ['positions', 'doggy', 'from-behind'],
    role_direction: 'mutual',
    for_gender: null,
  },
  {
    slug: 'position-cowgirl',
    category: 'positions',
    folder: 'positions',
    title: { ru: 'Наездница', en: 'Cowgirl' },
    user_description: { ru: 'Она сверху, лицом к нему. Контролирует ритм и глубину.', en: 'She on top, facing him. Controls the rhythm and depth.' },
    image_prompt: 'woman straddling man on bed, facing him, cowgirl position, bedroom',
    intensity: 2,
    tags: ['positions', 'cowgirl', 'woman-on-top'],
    role_direction: 'mutual',
    for_gender: null,
  },
  {
    slug: 'position-reverse-cowgirl',
    category: 'positions',
    folder: 'positions',
    title: { ru: 'Обратная наездница', en: 'Reverse Cowgirl' },
    user_description: { ru: 'Она сверху, спиной к нему. Отличный вид и новые ощущения.', en: 'She on top, back to him. Great view and new sensations.' },
    image_prompt: 'woman straddling man facing away, reverse cowgirl position, bedroom',
    intensity: 2,
    tags: ['positions', 'reverse-cowgirl', 'woman-on-top'],
    role_direction: 'mutual',
    for_gender: null,
  },
  {
    slug: 'position-69',
    category: 'positions',
    folder: 'positions',
    title: { ru: '69', en: '69' },
    user_description: { ru: 'Взаимный оральный секс одновременно. Давать и получать удовольствие вместе.', en: 'Mutual oral sex simultaneously. Giving and receiving pleasure together.' },
    image_prompt: 'couple in 69 position on bed, mutual oral, bedroom',
    intensity: 2,
    tags: ['positions', '69', 'oral', 'mutual'],
    role_direction: 'mutual',
    for_gender: null,
  },
  {
    slug: 'position-spooning',
    category: 'positions',
    folder: 'positions',
    title: { ru: 'Ложки', en: 'Spooning' },
    user_description: { ru: 'Оба на боку, он сзади. Нежная и интимная поза.', en: 'Both on their side, him behind. Gentle and intimate position.' },
    image_prompt: 'couple lying on their sides spooning position, him behind her, bedroom',
    intensity: 1,
    tags: ['positions', 'spooning', 'intimate'],
    role_direction: 'mutual',
    for_gender: null,
  },
  {
    slug: 'position-standing',
    category: 'positions',
    folder: 'positions',
    title: { ru: 'Стоя', en: 'Standing' },
    user_description: { ru: 'Секс стоя. У стены, в душе, или просто посреди комнаты.', en: 'Sex while standing. Against a wall, in shower, or just in the middle of the room.' },
    image_prompt: 'couple having sex standing against wall, both standing, hallway',
    intensity: 2,
    tags: ['positions', 'standing', 'athletic'],
    role_direction: 'mutual',
    for_gender: null,
  },
  {
    slug: 'position-sitting',
    category: 'positions',
    folder: 'positions',
    title: { ru: 'Сидя', en: 'Sitting' },
    user_description: { ru: 'Он сидит, она на нём. На стуле, диване или краю кровати.', en: 'He sits, she on him. On a chair, couch, or edge of bed.' },
    image_prompt: 'man sitting on chair, woman straddling him facing, sitting sex position',
    intensity: 2,
    tags: ['positions', 'sitting', 'face-to-face'],
    role_direction: 'mutual',
    for_gender: null,
  },

  // === LOCATIONS (6) ===
  {
    slug: 'location-bedroom',
    category: 'locations',
    folder: 'locations',
    title: { ru: 'Спальня', en: 'Bedroom' },
    user_description: { ru: 'Классика. Удобная кровать, приглушённый свет, никуда не торопиться.', en: 'Classic. Comfortable bed, dim lights, no rush.' },
    image_prompt: 'romantic bedroom with large bed, dim lighting, candles, intimate atmosphere',
    intensity: 1,
    tags: ['locations', 'bedroom', 'home'],
    role_direction: 'mutual',
    for_gender: null,
  },
  {
    slug: 'location-shower',
    category: 'locations',
    folder: 'locations',
    title: { ru: 'Душ', en: 'Shower' },
    user_description: { ru: 'Горячая вода, пар, скользкие тела. Тесно и возбуждающе.', en: 'Hot water, steam, slippery bodies. Tight and exciting.' },
    image_prompt: 'couple in glass shower, steam, water running, bathroom',
    intensity: 2,
    tags: ['locations', 'shower', 'bathroom', 'water'],
    role_direction: 'mutual',
    for_gender: null,
  },
  {
    slug: 'location-kitchen',
    category: 'locations',
    folder: 'locations',
    title: { ru: 'Кухня', en: 'Kitchen' },
    user_description: { ru: 'На столе, у холодильника, на стойке. Спонтанно и страстно.', en: 'On the table, by the fridge, on the counter. Spontaneous and passionate.' },
    image_prompt: 'couple on kitchen counter, modern kitchen, passionate moment',
    intensity: 2,
    tags: ['locations', 'kitchen', 'home', 'spontaneous'],
    role_direction: 'mutual',
    for_gender: null,
  },
  {
    slug: 'location-car',
    category: 'locations',
    folder: 'locations',
    title: { ru: 'Машина', en: 'Car' },
    user_description: { ru: 'На заднем сиденье или откинув переднее. Тесно, неудобно, но так возбуждающе.', en: 'Back seat or reclined front. Cramped, awkward, but so exciting.' },
    image_prompt: 'couple in car back seat, steamy windows, parked car at night',
    intensity: 3,
    tags: ['locations', 'car', 'public-adjacent', 'spontaneous'],
    role_direction: 'mutual',
    for_gender: null,
  },
  {
    slug: 'location-nature',
    category: 'locations',
    folder: 'locations',
    title: { ru: 'Природа', en: 'Nature' },
    user_description: { ru: 'В лесу, на пляже, в поле. Свежий воздух и риск быть замеченными.', en: 'In the forest, on the beach, in a field. Fresh air and risk of being seen.' },
    image_prompt: 'couple on blanket in secluded forest clearing, nature setting, daylight',
    intensity: 3,
    tags: ['locations', 'nature', 'outdoor', 'exhibitionism-lite'],
    role_direction: 'mutual',
    for_gender: null,
  },
  {
    slug: 'location-hotel',
    category: 'locations',
    folder: 'locations',
    title: { ru: 'Отель', en: 'Hotel' },
    user_description: { ru: 'Новая обстановка, большая кровать, никаких соседей за стеной. Можно громко.', en: 'New setting, big bed, no neighbors. Can be loud.' },
    image_prompt: 'luxury hotel room with king bed, city view through window, romantic lighting',
    intensity: 2,
    tags: ['locations', 'hotel', 'travel', 'romantic'],
    role_direction: 'mutual',
    for_gender: null,
  },

  // === LINGERIE STYLES (5 new, stockings and latex-leather exist) ===
  {
    slug: 'lingerie-lace',
    category: 'clothing',
    folder: 'lingerie-styles',
    title: { ru: 'Кружево', en: 'Lace' },
    user_description: { ru: 'Нежное кружевное бельё. Прозрачное и женственное.', en: 'Delicate lace lingerie. Sheer and feminine.' },
    image_prompt: 'woman in delicate black lace lingerie set, bra and panties, bedroom',
    intensity: 1,
    tags: ['lingerie', 'lace', 'feminine'],
    role_direction: 'mutual',
    for_gender: null,
    clarification_for: ['lingerie'],
  },
  {
    slug: 'lingerie-fishnet',
    category: 'clothing',
    folder: 'lingerie-styles',
    title: { ru: 'Сеточка', en: 'Fishnet' },
    user_description: { ru: 'Бельё в крупную или мелкую сетку. Дерзко и сексуально.', en: 'Fishnet lingerie. Bold and sexy.' },
    image_prompt: 'woman in black fishnet bodysuit, bedroom setting',
    intensity: 2,
    tags: ['lingerie', 'fishnet', 'bold'],
    role_direction: 'mutual',
    for_gender: null,
    clarification_for: ['lingerie'],
  },
  {
    slug: 'lingerie-sheer',
    category: 'clothing',
    folder: 'lingerie-styles',
    title: { ru: 'Полупрозрачное', en: 'Sheer' },
    user_description: { ru: 'Почти ничего не скрывает. Прозрачный шифон или сетка.', en: 'Hides almost nothing. Sheer chiffon or mesh.' },
    image_prompt: 'woman in sheer transparent negligee, silhouette visible, bedroom',
    intensity: 2,
    tags: ['lingerie', 'sheer', 'transparent'],
    role_direction: 'mutual',
    for_gender: null,
    clarification_for: ['lingerie'],
  },
  {
    slug: 'lingerie-satin',
    category: 'clothing',
    folder: 'lingerie-styles',
    title: { ru: 'Атлас', en: 'Satin' },
    user_description: { ru: 'Гладкий шелковистый атлас. Скользит по коже.', en: 'Smooth silky satin. Slides on skin.' },
    image_prompt: 'woman in red satin slip dress, luxurious fabric, bedroom',
    intensity: 1,
    tags: ['lingerie', 'satin', 'silk', 'elegant'],
    role_direction: 'mutual',
    for_gender: null,
    clarification_for: ['lingerie'],
  },
  {
    slug: 'lingerie-corset',
    category: 'clothing',
    folder: 'lingerie-styles',
    title: { ru: 'Корсет', en: 'Corset' },
    user_description: { ru: 'Утягивающий корсет, подчёркивающий талию и грудь.', en: 'Tight corset accentuating waist and bust.' },
    image_prompt: 'woman in black lace-up corset, cinched waist, bedroom',
    intensity: 2,
    tags: ['lingerie', 'corset', 'structured'],
    role_direction: 'mutual',
    for_gender: null,
    clarification_for: ['lingerie'],
  },

  // === TOYS (5 new) ===
  {
    slug: 'toy-wand',
    category: 'toys',
    folder: 'toys',
    title: { ru: 'Вонд', en: 'Wand Vibrator' },
    subtitle: { ru: 'Мощный массажёр', en: 'Powerful massager' },
    user_description: { ru: 'Мощный вибромассажёр на длинной ручке. Интенсивная стимуляция.', en: 'Powerful vibrating massager on a long handle. Intense stimulation.' },
    image_prompt: 'magic wand style vibrator, bedroom setting',
    intensity: 2,
    tags: ['toys', 'wand', 'vibrator', 'powerful'],
    role_direction: 'mutual',
    for_gender: null,
    clarification_for: ['toys-interest'],
  },
  {
    slug: 'toy-beads',
    category: 'toys',
    folder: 'toys',
    title: { ru: 'Шарики', en: 'Beads' },
    subtitle: { ru: 'Анальные или вагинальные', en: 'Anal or vaginal' },
    user_description: { ru: 'Цепочка шариков разного размера. Медленно вводить и вытягивать.', en: 'String of beads of different sizes. Slowly insert and pull out.' },
    image_prompt: 'silicone anal beads toy, bedroom setting',
    intensity: 2,
    tags: ['toys', 'beads', 'anal', 'vaginal'],
    role_direction: 'mutual',
    for_gender: null,
    clarification_for: ['toys-interest'],
  },
  {
    slug: 'toy-clitoral',
    category: 'toys',
    folder: 'toys',
    title: { ru: 'Клиторальный', en: 'Clitoral Stimulator' },
    subtitle: { ru: 'Вакуумный или волновой', en: 'Suction or wave' },
    user_description: { ru: 'Игрушка для прямой стимуляции клитора. Вакуум или волны удовольствия.', en: 'Toy for direct clitoral stimulation. Suction or waves of pleasure.' },
    image_prompt: 'clitoral suction toy, modern design, bedroom',
    intensity: 2,
    tags: ['toys', 'clitoral', 'stimulator'],
    role_direction: 'mutual',
    for_gender: null,
    clarification_for: ['toys-interest'],
  },
  {
    slug: 'toy-plug-small',
    category: 'toys',
    folder: 'toys',
    title: { ru: 'Маленькая пробка', en: 'Small Plug' },
    subtitle: { ru: 'Для начинающих', en: 'For beginners' },
    user_description: { ru: 'Небольшая анальная пробка. Идеальна для знакомства с ощущениями.', en: 'Small anal plug. Perfect for exploring new sensations.' },
    image_prompt: 'small silicone anal plug, bedroom',
    intensity: 2,
    tags: ['toys', 'plug', 'anal', 'beginner'],
    role_direction: 'mutual',
    for_gender: null,
    clarification_for: ['toys-interest', 'anal-interest'],
  },
  {
    slug: 'toy-plug-large',
    category: 'toys',
    folder: 'toys',
    title: { ru: 'Большая пробка', en: 'Large Plug' },
    subtitle: { ru: 'Для опытных', en: 'For experienced' },
    user_description: { ru: 'Крупная анальная пробка. Ощущение наполненности.', en: 'Large anal plug. Feeling of fullness.' },
    image_prompt: 'large metal anal plug, bedroom',
    intensity: 3,
    tags: ['toys', 'plug', 'anal', 'advanced'],
    role_direction: 'mutual',
    for_gender: null,
    clarification_for: ['toys-interest', 'anal-interest'],
  },

  // === SPECIAL SCENES (2 new) ===
  {
    slug: 'sex-swing',
    category: 'furniture',
    folder: 'furniture',
    title: { ru: 'Секс-качели', en: 'Sex Swing' },
    user_description: { ru: 'Подвесные качели для секса. Новые позы и невесомость.', en: 'Suspended sex swing. New positions and weightlessness.' },
    image_prompt: 'sex swing hanging from ceiling, bedroom or dungeon setting',
    intensity: 3,
    tags: ['furniture', 'swing', 'positions', 'advanced'],
    role_direction: 'mutual',
    for_gender: null,
  },
  {
    slug: 'anal-hook',
    category: 'bondage',
    folder: 'bondage-types',
    title: { ru: 'Анальный крюк', en: 'Anal Hook' },
    user_description: { ru: 'Металлический крюк с шариком. Часто используется в бондаже, привязывается к верёвкам.', en: 'Metal hook with a ball. Often used in bondage, tied to ropes.' },
    image_prompt: 'stainless steel anal hook bondage device',
    intensity: 4,
    tags: ['bondage', 'anal-hook', 'metal', 'advanced'],
    role_direction: 'mutual',
    for_gender: null,
    clarification_for: ['bondage-give', 'bondage-receive', 'anal-interest'],
  },

  // === FINISH PREFERENCES (M/F paired) ===
  {
    slug: 'finish-preference-m',
    category: 'body-fluids',
    folder: 'body-fluids',
    title: { ru: 'Куда кончить', en: 'Where to finish' },
    subtitle: { ru: 'Его предпочтения', en: 'His preferences' },
    user_description: { ru: 'Куда тебе нравится кончать? На лицо, грудь, внутрь, или куда-то ещё?', en: 'Where do you like to finish? Face, chest, inside, or somewhere else?' },
    image_prompt: 'abstract intimate moment, implied finish, bedroom',
    intensity: 2,
    tags: ['finish', 'cum', 'preference'],
    role_direction: 'm_to_f',
    for_gender: 'male',
    paired_with: 'finish-preference-f',
  },
  {
    slug: 'finish-preference-f',
    category: 'body-fluids',
    folder: 'body-fluids',
    title: { ru: 'Куда ему кончить', en: 'Where he finishes' },
    subtitle: { ru: 'Её предпочтения', en: 'Her preferences' },
    user_description: { ru: 'Куда тебе нравится когда он кончает? На лицо, грудь, внутрь, или куда-то ещё?', en: 'Where do you like him to finish? Face, chest, inside, or somewhere else?' },
    image_prompt: 'abstract intimate moment, implied finish, bedroom',
    intensity: 2,
    tags: ['finish', 'cum', 'preference'],
    role_direction: 'f_to_m',
    for_gender: 'female',
    paired_with: 'finish-preference-m',
  },
];

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('Generating missing scenes...\n');

  let created = 0;
  let skipped = 0;

  for (const template of scenes) {
    const folderPath = path.join(OUTPUT_BASE, template.folder);
    const filePath = path.join(folderPath, `${template.slug}.json`);

    // Check if already exists
    if (fs.existsSync(filePath)) {
      console.log(`SKIP: ${template.slug} (already exists)`);
      skipped++;
      continue;
    }

    // Create folder if needed
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Create scene
    const scene = createScene(template);
    fs.writeFileSync(filePath, JSON.stringify(scene, null, 2) + '\n');
    console.log(`CREATE: ${template.slug}`);
    created++;
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total defined: ${scenes.length}`);
}

main().catch(console.error);
