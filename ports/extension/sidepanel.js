/* Turnstone side panel scaffold — the real queue UI gets built here.
   Contract with background.js: sendMessage({type:'open-tab'|'focus-tab'}) to drive tabs;
   listen for {type:'turnstone-add-link'} and check chrome.storage.local.pendingLink on load.
   UI/logic mirrors app.html (cards, presets, complete/undo, sorting, auto-advance). */
console.log('[Turnstone ext] side panel scaffold loaded');
