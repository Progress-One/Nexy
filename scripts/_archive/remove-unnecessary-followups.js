const fs = require('fs');
const path = require('path');

const scenesDir = './scenes/v2/composite';
const categories = fs.readdirSync(scenesDir).filter(f => fs.statSync(path.join(scenesDir, f)).isDirectory());

// Patterns for follow-ups to remove
const removePatterns = ['what_appeals', 'appeal', 'attracts', 'arousal', 'emotional', 'why_'];

let totalRemoved = 0;
let filesModified = 0;

categories.forEach(cat => {
  const catPath = path.join(scenesDir, cat);
  const files = fs.readdirSync(catPath).filter(f => f.endsWith('.json') && f !== '_index.json');

  files.forEach(file => {
    try {
      const filePath = path.join(catPath, file);
      const scene = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let modified = false;

      if (scene.elements) {
        scene.elements.forEach(el => {
          if (el.follow_ups && el.follow_ups.length > 0) {
            const originalCount = el.follow_ups.length;

            // Filter out follow-ups that match remove patterns
            el.follow_ups = el.follow_ups.filter(fu => {
              const shouldRemove = removePatterns.some(p => fu.id.includes(p));
              if (shouldRemove) {
                console.log(`Removing: ${scene.slug || file} -> ${el.id} -> ${fu.id}`);
                totalRemoved++;
              }
              return !shouldRemove;
            });

            if (el.follow_ups.length !== originalCount) {
              modified = true;
            }

            // If element has no follow-ups left, remove the follow_ups array
            if (el.follow_ups.length === 0) {
              delete el.follow_ups;
            }
          }
        });

        // Also check for elements that only had "what_appeals" type and remove them
        scene.elements = scene.elements.filter(el => {
          // Keep element if it's not just "what_appeals" type
          if (el.id === 'what_appeals' && !el.follow_ups) {
            console.log(`Removing element: ${scene.slug || file} -> ${el.id}`);
            modified = true;
            return false;
          }
          return true;
        });
      }

      if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(scene, null, 2));
        filesModified++;
      }
    } catch (e) {
      console.error(`Error processing ${file}:`, e.message);
    }
  });
});

console.log('');
console.log('=== SUMMARY ===');
console.log(`Follow-ups removed: ${totalRemoved}`);
console.log(`Files modified: ${filesModified}`);
