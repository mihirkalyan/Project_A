// The ONLY module that imports virtual:site-content (lint-enforced). The data
// is parsed, validated and stripped in Node by the plugin in vite.config.ts,
// so everything else receives plain published data.
export { intros, topics } from 'virtual:site-content'
