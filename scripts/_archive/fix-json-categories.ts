import * as fs from 'fs';
import * as path from 'path';

const replacements: Record<string, string> = {
  'age_play': 'age-play',
  'body_fluids': 'body-fluids',
  'cnc_rough': 'cnc-rough',
  'control_power': 'control-power',
  'impact_pain': 'impact-pain',
  'intimacy_outside': 'intimacy-outside',
  'pet_play': 'pet-play',
  'worship_service': 'worship-service',
  'solo_mutual': 'solo-mutual',
  'emotional_context': 'emotional-context',
};

function processDir(dir: string) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (file.endsWith('.json')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      let changed = false;

      for (const [from, to] of Object.entries(replacements)) {
        const regex = new RegExp(`"category":\\s*"${from}"`, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, `"category": "${to}"`);
          changed = true;
        }
      }

      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed:', fullPath.replace(/.*composite[\\\/]/, ''));
      }
    }
  }
}

const basePath = path.join(__dirname, '..', 'scenes', 'v2', 'composite');
console.log('Fixing JSON categories in:', basePath);
processDir(basePath);
console.log('\nDone!');
