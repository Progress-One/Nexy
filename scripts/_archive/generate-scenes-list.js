const fs = require('fs');
const path = require('path');

const scenesDir = path.join(__dirname, '..', 'scenes', 'v2', 'composite');
const output = [];

function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (entry.name.endsWith('.json') && !entry.name.startsWith('_')) {
      try {
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        const category = path.basename(path.dirname(fullPath));
        const title = content.title?.ru || content.title?.en || content.slug;
        const desc = content.user_description?.ru || content.ai_description?.ru || '';
        const forGender = content.for_gender === 'male' ? 'М' : content.for_gender === 'female' ? 'Ж' : 'Все';
        const gate = content.clarification_for?.join(', ') || '-';
        output.push({
          category,
          slug: content.slug,
          title,
          desc,
          forGender,
          gate,
          intensity: content.intensity || 0,
          isActive: content.is_active !== false
        });
      } catch(e) {
        console.error('Error processing', fullPath, e.message);
      }
    }
  }
}

processDir(scenesDir);

// Sort by category then title
output.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));

// Group by category
let result = '# Все сцены intimate-discovery\n\n';
result += `Всего: ${output.length} сцен\n`;
result += `Активных: ${output.filter(s => s.isActive).length}\n\n`;

let currentCat = '';

for (const s of output) {
  if (s.category !== currentCat) {
    currentCat = s.category;
    const catScenes = output.filter(x => x.category === currentCat);
    result += `\n---\n\n## ${currentCat.toUpperCase()} (${catScenes.length})\n\n`;
  }

  const status = s.isActive ? '' : ' [НЕАКТИВНА]';
  result += `### ${s.title}${status}\n`;
  result += `**${s.slug}** | ${s.forGender} | int:${s.intensity} | gates: ${s.gate}\n`;
  if (s.desc) result += `> ${s.desc}\n`;
  result += '\n';
}

const outputPath = path.join(__dirname, '..', 'docs', 'all-scenes-ru.md');
fs.writeFileSync(outputPath, result);
console.log(`Created ${outputPath} with ${output.length} scenes`);
