// Mapping from old SCENE_GATES slugs to actual DB slugs
const SLUG_FIXES: Record<string, string> = {
  // ORAL
  'facesitting-f-on-m': 'facesitting-she-on-him',
  'facesitting-m-on-f': 'facesitting-he-on-her',
  'rimming-m-to-f': 'rimming-he-to-her',
  'rimming-f-to-m': 'rimming-she-to-him',

  // BODY FLUIDS
  'golden-shower-m-to-f': 'golden-shower-he-on-her',
  'golden-shower-f-to-m': 'golden-shower-she-on-him',
  'spitting-m-to-f': 'spitting-he-on-her',
  'spitting-f-to-m': 'spitting-she-on-him',

  // WORSHIP
  'body-worship-m-to-f': 'body-worship-he-worships-her',
  'body-worship-f-to-m': 'body-worship-she-worships-him',
  'foot-worship-m-to-f': 'foot-worship-he-worships-her',
  'foot-worship-f-to-m': 'foot-worship-she-worships-his',

  // IMPACT
  'spanking-m-to-f': 'spanking-he-spanks-her',
  'spanking-f-to-m': 'spanking-she-spanks-him',
  'choking-m-to-f': 'choking-he-chokes-her',
  'choking-f-to-m': 'choking-she-chokes-him',
  'face-slapping-m-to-f': 'face-slapping-he-slaps-her',
  'face-slapping-f-to-m': 'face-slapping-she-slaps-him',
  'whipping-m-to-f': 'whipping-he-whips-her',
  'whipping-f-to-m': 'whipping-she-whips-him',
  'wax-play-m-to-f': 'wax-play-he-on-her',
  'wax-play-f-to-m': 'wax-play-she-on-him',
  'nipple-play-m-to-f': 'nipple-play-he-on-her',
  'nipple-play-f-to-m': 'nipple-play-she-on-him',

  // VERBAL
  'degradation-m-to-f': 'degradation-he-degrades-her',
  'degradation-f-to-m': 'degradation-she-degrades-him',
  'praise-m-to-f': 'praise-he-praises-her',
  'praise-f-to-m': 'praise-she-praises-him',

  // CONTROL
  'bondage-m-ties-f': 'bondage-he-ties-her',
  'bondage-f-ties-m': 'bondage-she-ties-him',
  'collar-m-owns-f': 'collar-he-owns-her',
  'collar-f-owns-m': 'collar-she-owns-him',
  'chastity-m-locked': 'chastity-he-locked',
  'chastity-f-locked': 'chastity-she-locked',

  // CNC
  'cnc-m-takes-f': 'cnc-he-takes-her',
  'cnc-f-takes-m': 'cnc-she-takes-him',
  'somnophilia-m-to-f': 'somnophilia-he-takes-her',
  'somnophilia-f-to-m': 'somnophilia-she-takes-him',

  // GROUP
  'swinging': 'swinging-partner-swap',
  'hotwife': 'hotwife-vixen',

  // EXHIBITIONISM
  'glory-hole-f-gives': 'glory-hole-she-gives',
  'glory-hole-m-gives': 'glory-hole-he-gives',
  'striptease-f': 'female-striptease',
  'striptease-m': 'male-striptease',

  // ROLEPLAY
  'stranger': 'stranger-roleplay',
  'pet-play-f-is-pet': 'pet-play-she-is-pet',
  'pet-play-m-is-pet': 'pet-play-he-is-pet',

  // TOYS
  'vibrator': 'vibrator-play',
  'dildo': 'dildo-play',
  'remote-control': 'remote-control-toy',

  // CLOTHING
  'lingerie-f': 'female-lingerie',
  'lingerie-m': 'male-lingerie',
  'stockings': 'stockings-garters',
  'harness-f': 'female-harness',
  'harness-m': 'male-harness',
  'uniforms-f': 'female-uniforms',
  'uniforms-m': 'male-uniforms',

  // ROMANTIC
  'massage-m-to-f': 'massage-he-massages-her',
  'massage-f-to-m': 'massage-she-massages-him',
};

// Output the fixes as JS for manual update
console.log('=== SLUG FIXES ===\n');
for (const [old, newSlug] of Object.entries(SLUG_FIXES)) {
  console.log(`'${old}' → '${newSlug}'`);
}
console.log(`\nTotal: ${Object.keys(SLUG_FIXES).length} fixes`);
