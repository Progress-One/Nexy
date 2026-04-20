import * as fs from 'fs';
import * as path from 'path';

const SCENES_DIR = path.join(__dirname, '../scenes/v2/composite');

// Neutral rewrites for mutual scenes
const REWRITES: Record<string, { ru: string; en: string }> = {
  // POSITIONS
  'position-missionary': {
    ru: 'Классическая позиция лицом к лицу. Один сверху, другой снизу.',
    en: 'Classic face-to-face position. One on top, one below.'
  },
  'position-doggy': {
    ru: 'Один на четвереньках, другой сзади. Глубокое проникновение.',
    en: 'One on all fours, the other behind. Deep penetration.'
  },
  'position-cowgirl': {
    ru: 'Один сверху, лицом к партнёру. Контроль темпа и глубины.',
    en: 'One on top, facing partner. Control over pace and depth.'
  },
  'position-reverse-cowgirl': {
    ru: 'Один сверху, спиной к партнёру. Вид сзади.',
    en: 'One on top, back to partner. View from behind.'
  },
  'position-spooning': {
    ru: 'Оба на боку, один сзади. Интимно и расслабленно.',
    en: 'Both on side, one behind. Intimate and relaxed.'
  },
  'position-sitting': {
    ru: 'Один сидит, другой сверху. На стуле, диване, кровати.',
    en: 'One sits, the other on top. Chair, couch, bed.'
  },
  'position-standing': {
    ru: 'Секс стоя. У стены, в душе, посреди комнаты.',
    en: 'Sex while standing. Against wall, in shower, anywhere.'
  },

  // LOCATIONS
  'location-bedroom': {
    ru: 'Секс в спальне. Кровать, приглушённый свет.',
    en: 'Sex in bedroom. Bed, dim lights.'
  },
  'location-shower': {
    ru: 'Секс в душе. Горячая вода, пар, скользкие тела.',
    en: 'Sex in shower. Hot water, steam, slippery bodies.'
  },
  'location-kitchen': {
    ru: 'Спонтанный секс на кухне. На столе, на стойке.',
    en: 'Spontaneous sex in kitchen. On table, on counter.'
  },
  'location-car': {
    ru: 'Секс в машине. Заднее сиденье, запотевшие окна.',
    en: 'Sex in car. Back seat, foggy windows.'
  },
  'location-nature': {
    ru: 'Секс на природе. Лес, пляж, поле.',
    en: 'Sex outdoors. Forest, beach, field.'
  },
  'location-hotel': {
    ru: 'Секс в отеле. Большая кровать, можно шуметь.',
    en: 'Sex in hotel. Big bed, can be loud.'
  },

  // LINGERIE-STYLES
  'lingerie-lace': {
    ru: 'Нежное кружевное бельё. Прозрачное и женственное.',
    en: 'Delicate lace lingerie. Sheer and feminine.'
  },
  'lingerie-fishnet': {
    ru: 'Бельё-сеточка. Крупная или мелкая сетка на теле.',
    en: 'Fishnet lingerie. Large or small mesh on body.'
  },
  'lingerie-sheer': {
    ru: 'Прозрачное бельё. Почти ничего не скрывает.',
    en: 'Sheer lingerie. Hides almost nothing.'
  },
  'lingerie-satin': {
    ru: 'Атласное бельё. Гладкое, скользит по коже.',
    en: 'Satin lingerie. Smooth, slides on skin.'
  },
  'lingerie-corset': {
    ru: 'Утягивающий корсет. Подчёркивает талию и грудь.',
    en: 'Tight corset. Emphasizes waist and chest.'
  },

  // BONDAGE-TYPES
  'bondage-restraint': {
    ru: 'Связывание рук. Наручники, ремни, мягкие путы.',
    en: 'Tying hands. Handcuffs, straps, soft bonds.'
  },
  'bondage-shibari': {
    ru: 'Японское верёвочное искусство. Красивые узоры на теле.',
    en: 'Japanese rope art. Beautiful patterns on body.'
  },
  'bondage-spreader-bar': {
    ru: 'Распорка между ногами. Ноги разведены в стороны.',
    en: 'Spreader bar. Legs spread apart.'
  },
  'bondage-st-andrews-cross': {
    ru: 'Фиксация на X-образной раме. Руки и ноги разведены.',
    en: 'Fixed to X-frame. Arms and legs spread.'
  },
  'bondage-suspension': {
    ru: 'Подвешивание на верёвках. От лёгкого до полного.',
    en: 'Rope suspension. From light to full.'
  },
  'bondage-chains': {
    ru: 'Металлические цепи. Холодные, звенят при движении.',
    en: 'Metal chains. Cold, rattle with movement.'
  },
  'anal-hook': {
    ru: 'Анальный крюк с шариком. Привязывается к верёвкам.',
    en: 'Anal hook with ball. Tied to ropes.'
  },

  // ROMANTIC
  'romantic-sex': {
    ru: 'Медленный, нежный секс. Поцелуи, глаза в глаза, свечи.',
    en: 'Slow, gentle sex. Kisses, eye contact, candles.'
  },

  // OTHER MUTUAL
  'kitchen-counter': {
    ru: 'Спонтанный секс на кухне. Пока готовится еда.',
    en: 'Spontaneous kitchen sex. While cooking.'
  },
  'secret-touch': {
    ru: 'Незаметные прикосновения в публичном месте. Рука под столом.',
    en: 'Secret touches in public. Hand under table.'
  },
  'voice-instructions': {
    ru: 'Голосовые инструкции по телефону. Говоришь что делать.',
    en: 'Voice instructions by phone. Telling what to do.'
  },
  'service-roleplay': {
    ru: 'Ролевая игра в горничную. Обслуживание и секс.',
    en: 'Maid roleplay. Service and sex.'
  },
  'doctor-patient': {
    ru: 'Ролевая игра врач и пациент. Осмотр переходит в секс.',
    en: 'Doctor-patient roleplay. Exam leads to sex.'
  },

  // SENSORY
  'blindfold': {
    ru: 'Повязка на глазах. Обострённые ощущения.',
    en: 'Blindfold. Heightened sensations.'
  },
  'feather-tickle': {
    ru: 'Щекотка пером, мехом или пальцами.',
    en: 'Tickling with feather, fur, or fingers.'
  },
  'ice-play': {
    ru: 'Кубик льда по телу. Контраст холода и тепла.',
    en: 'Ice cube on body. Cold and warm contrast.'
  },

  // TOYS
  'nipple-clamps': {
    ru: 'Зажимы на сосках. Регулируемое давление.',
    en: 'Nipple clamps. Adjustable pressure.'
  },
  'toy-wand': {
    ru: 'Мощный вибромассажёр. Интенсивная стимуляция.',
    en: 'Powerful wand vibrator. Intense stimulation.'
  },
  'vibrator-play': {
    ru: 'Вибратор для стимуляции. Разные режимы и скорости.',
    en: 'Vibrator for stimulation. Various modes and speeds.'
  },

  // OTHER
  'joi': {
    ru: 'Инструкции как мастурбировать. Голосом или текстом.',
    en: 'Masturbation instructions. Voice or text.'
  },
  'mutual-masturbation': {
    ru: 'Взаимная мастурбация. Смотреть друг на друга.',
    en: 'Mutual masturbation. Watching each other.'
  },
  'finger-sucking': {
    ru: 'Пальцы во рту. Нежно облизывать и посасывать.',
    en: 'Fingers in mouth. Gently licking and sucking.'
  },
  'dirty-talk': {
    ru: 'Грязные слова во время секса. Описания, желания.',
    en: 'Dirty talk during sex. Descriptions, desires.'
  },
  'aftercare': {
    ru: 'Забота после секса. Обнимашки, разговоры, вода.',
    en: 'Care after sex. Cuddles, talking, water.'
  },
  'armpit': {
    ru: 'Подмышки партнёра. Нюхать, лизать, целовать.',
    en: 'Partner armpits. Smelling, licking, kissing.'
  },

  // CLOTHING
  'heels-only': {
    ru: 'Голая, только в каблуках. Сексуально и властно.',
    en: 'Naked, only in heels. Sexy and powerful.'
  },
  'latex-leather': {
    ru: 'Одежда из латекса, кожи или винила.',
    en: 'Latex, leather, or vinyl clothing.'
  },
  'stockings-garters': {
    ru: 'Чулки с поясом. Гладить ноги, снимать чулки.',
    en: 'Stockings with garters. Stroking legs, removing.'
  },
  'torn-clothes': {
    ru: 'Рвать одежду в страсти. Пуговицы летят, ткань рвётся.',
    en: 'Tearing clothes in passion. Buttons fly, fabric rips.'
  },

  // GROUP
  'threesome-fmf': {
    ru: 'Тройка ЖМЖ. Один мужчина, две женщины.',
    en: 'FMF threesome. One man, two women.'
  },
  'threesome-mfm': {
    ru: 'Тройка МЖМ. Одна женщина, два мужчины.',
    en: 'MFM threesome. One woman, two men.'
  },
  'double-penetration': {
    ru: 'Двойное проникновение. Два члена одновременно.',
    en: 'Double penetration. Two cocks at once.'
  },

  // EXHIBITIONISM
  'exhibitionism': {
    ru: 'Показывать тело или заниматься сексом на виду у других.',
    en: 'Showing body or having sex where others can see.'
  },
  'public-sex': {
    ru: 'Секс в публичном месте. Парк, примерочная, риск.',
    en: 'Sex in public place. Park, fitting room, risk.'
  },
  'filming': {
    ru: 'Снимать секс на видео. Для себя или чтобы поделиться.',
    en: 'Filming sex. For yourselves or to share.'
  },

  // EMOTIONAL
  'cheating-fantasy': {
    ru: 'Фантазия об измене. Запретность, риск, тайна.',
    en: 'Cheating fantasy. Forbidden, risky, secret.'
  },
  'emotional-sex': {
    ru: 'Эмоциональный секс. После ссоры, при примирении, на радостях.',
    en: 'Emotional sex. After fight, making up, celebrating.'
  },
  'makeup-sex': {
    ru: 'Секс после ссоры. Резко или нежно.',
    en: 'Makeup sex. Rough or tender.'
  },

  // CONTROL
  'sex-tasks': {
    ru: 'Сексуальные задания. Фото, фантазии, прикосновения.',
    en: 'Sexual tasks. Photos, fantasies, touches.'
  },
  'truth-or-dare': {
    ru: 'Эротическая правда или действие. Откровенные вопросы, сексуальные вызовы.',
    en: 'Erotic truth or dare. Intimate questions, sexual challenges.'
  },

  // EXTREME
  'fucking-machine': {
    ru: 'Секс-машина. Механическое проникновение, контроль скорости.',
    en: 'Fucking machine. Mechanical penetration, speed control.'
  },

  // BODY-WRITING
  'body-writing-words': {
    ru: 'Надписи на теле. Грязные слова маркером на коже.',
    en: 'Writing on body. Dirty words with marker on skin.'
  },

  // TOY
  'butt-plug': {
    ru: 'Анальная пробка. Во время секса или под одеждой.',
    en: 'Butt plug. During sex or under clothes.'
  },
  'dildo-play': {
    ru: 'Фаллоимитатор. Вагинально, анально, с партнёром.',
    en: 'Dildo play. Vaginal, anal, with partner.'
  },
  'toy-clitoral': {
    ru: 'Клиторальная игрушка. Вакуум или волны удовольствия.',
    en: 'Clitoral toy. Suction or pleasure waves.'
  },

  // BASELINE updates
  'intensity': {
    ru: 'Предпочтения в интенсивности — нежный секс или жёсткий, с хватанием за волосы?',
    en: 'Intensity preference — gentle sex or rough, with hair pulling?'
  },
  'exhibitionism': {
    ru: 'Показывать своё тело — партнёру, на камеру, или когда могут увидеть другие.',
    en: 'Showing your body — to partner, on camera, or when others might see.'
  },
  'voyeurism': {
    ru: 'Наблюдать — как партнёр раздевается, мастурбирует, или как другие занимаются сексом.',
    en: 'Watching — partner undressing, masturbating, or others having sex.'
  },
  'praise-interest': {
    ru: 'Похвала в постели: "Какая ты красивая", "Хороший мальчик", "Молодец".',
    en: 'Praise in bed: "You\'re so beautiful", "Good boy", "Well done".'
  },
};

function findJsonFiles(dir: string): string[] {
  const files: string[] = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findJsonFiles(fullPath));
    } else if (item.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files;
}

function main() {
  const files = findJsonFiles(SCENES_DIR);
  let updated = 0;

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const scene = JSON.parse(content);

      // Skip inactive
      if (scene.is_active === false) continue;

      const slug = scene.slug;
      if (REWRITES[slug]) {
        scene.user_description = REWRITES[slug];
        fs.writeFileSync(file, JSON.stringify(scene, null, 2) + '\n');
        console.log(`✓ Updated: ${slug}`);
        updated++;
      }
    } catch (e) {
      console.error(`Error: ${file}`, e);
    }
  }

  console.log(`\nTotal updated: ${updated}`);
}

main();
