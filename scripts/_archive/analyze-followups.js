const fs = require('fs');
const path = require('path');

const scenesDir = './scenes/v2/composite';
const categories = fs.readdirSync(scenesDir).filter(f => fs.statSync(path.join(scenesDir, f)).isDirectory());

const followUpPatterns = {
  remove: [],
  keep: []
};

const removePatterns = ['what_appeals', 'appeal', 'attracts', 'arousal', 'emotional', 'why_'];

categories.forEach(cat => {
  const catPath = path.join(scenesDir, cat);
  const files = fs.readdirSync(catPath).filter(f => f.endsWith('.json') && f !== '_index.json');

  files.forEach(file => {
    try {
      const scene = JSON.parse(fs.readFileSync(path.join(catPath, file), 'utf8'));
      if (scene.elements) {
        scene.elements.forEach(el => {
          if (el.follow_ups) {
            el.follow_ups.forEach(fu => {
              const shouldRemove = removePatterns.some(p => fu.id.includes(p));
              const entry = { scene: scene.slug || file, element: el.id, followUp: fu.id, type: fu.type };
              if (shouldRemove) {
                followUpPatterns.remove.push(entry);
              } else {
                followUpPatterns.keep.push(entry);
              }
            });
          }
        });
      }
    } catch (e) {}
  });
});

console.log('=== FOLLOW-UPS TO REMOVE (' + followUpPatterns.remove.length + ') ===');
followUpPatterns.remove.slice(0, 30).forEach(f => console.log(f.scene + ' -> ' + f.element + ' -> ' + f.followUp));
if (followUpPatterns.remove.length > 30) console.log('... and ' + (followUpPatterns.remove.length - 30) + ' more');

console.log('');
console.log('=== FOLLOW-UPS TO KEEP (' + followUpPatterns.keep.length + ') ===');
followUpPatterns.keep.slice(0, 30).forEach(f => console.log(f.scene + ' -> ' + f.element + ' -> ' + f.followUp + ' (' + f.type + ')'));
if (followUpPatterns.keep.length > 30) console.log('... and ' + (followUpPatterns.keep.length - 30) + ' more');
