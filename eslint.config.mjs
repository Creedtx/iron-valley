// Catches names used but never defined (the generator-card freeze in build 0.9 was one of these).
import globals from './tools/node_modules/globals/index.js';
export default [{ files:['game/game.js'], languageOptions:{ ecmaVersion:2022, sourceType:'module', globals:{ ...globals.browser, __PLAYABLES__:'readonly' } },
  rules:{ 'no-undef':'error', 'no-unused-vars':'off', 'no-dupe-keys':'error', 'no-unreachable':'error', 'no-const-assign':'error', 'no-redeclare':'error', 'no-self-assign':'error', 'use-isnan':'error', 'valid-typeof':'error' } }];
