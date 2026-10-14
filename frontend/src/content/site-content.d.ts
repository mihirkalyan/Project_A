// Types for the virtual module produced by the siteContent() plugin in vite.config.ts.
declare module 'virtual:site-content' {
  export const topics: readonly import('./publish.ts').PublishedTopic[]
  export const intros: readonly import('./publish.ts').PublishedIntro[]
}
