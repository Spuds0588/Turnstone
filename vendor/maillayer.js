/**
 * MailLayer Embedded — Native Email Sending via Deep Links
 * Version: 2.1.0
 * License: MIT
 */

(() => {
    'use strict';

    const script = document.currentScript || document.querySelector('script[src*="maillayer.js"]');
    const config = {
        autoDetect: script?.dataset.maillayerAutoDetect === 'true',
        autoLinkColor: script?.dataset.maillayerAutoLinkColor || '#5998c5',
        provider: script?.dataset.maillayerProvider || null
    };

    const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 768 && 'ontouchstart' in window);

    const getDeepLink = (provider, { to = '', cc = '', bcc = '', subject = '', body = '' }) => {
        const [t, c, b, s, bd] = [to, cc, bcc, subject, body].map(encodeURIComponent);
        if (provider === 'outlook' || provider === 'outlook_web') return `https://outlook.live.com/mail/0/deeplink/compose?to=${t}&cc=${c}&bcc=${b}&subject=${s}&body=${bd}`;
        if (provider === 'yahoo' || provider === 'yahoo_web') return `https://compose.mail.yahoo.com/?to=${t}&cc=${c}&bcc=${b}&subj=${s}&body=${bd}`;
        return `https://mail.google.com/mail/?view=cm&fs=1&to=${t}&cc=${c}&bcc=${b}&su=${s}&body=${bd}`;
    };

    const buildMailtoUrl = ({ to = '', cc = '', bcc = '', subject = '', body = '' }) => {
        const params = new URLSearchParams();
        if (cc) params.set('cc', cc);
        if (bcc) params.set('bcc', bcc);
        if (subject) params.set('subject', subject);
        if (body) params.set('body', body);
        const q = params.toString();
        return `mailto:${encodeURIComponent(to)}${q ? '?' + q : ''}`;
    };

    const parseMailtoUrl = (url) => {
        const [toPart, queryPart] = url.replace(/^mailto:/i, '').split('?');
        const res = { to: decodeURIComponent(toPart || ''), cc: '', bcc: '', subject: '', body: '' };
        if (queryPart) {
            const p = new URLSearchParams(queryPart);
            ['cc', 'bcc', 'subject', 'body'].forEach(k => res[k] = p.get(k) || '');
        }
        return res;
    };

    const executeEmailAction = (provider, data) => {
        if (provider === 'native') {
            window.location.href = buildMailtoUrl(data);
        } else {
            const url = getDeepLink(provider, data);
            window.open(url, 'MailLayerPopup', 'width=900,height=700,resizable=yes,scrollbars=yes');
        }
    };

    const promptProviderSelection = (data) => {
        if (document.getElementById('maillayer-provider-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'maillayer-provider-modal';
        Object.assign(modal.style, {
            position: 'fixed',
            inset: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: '2147483647',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            padding: '20px'
        });

        modal.innerHTML = `
            <div style="background: #111827; border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; padding: 28px; width: 100%; max-width: 420px; color: #f3f4f6; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); position: relative; animation: mlFadeIn 0.25s ease-out;">
                <button id="ml-close-modal" style="position: absolute; top: 16px; right: 16px; background: none; border: none; color: #9ca3af; font-size: 24px; cursor: pointer; line-height: 1;">&times;</button>
                <div style="display: flex; align-items: center; margin-bottom: 16px;">
                    <div style="background: #e03616; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 1.2rem; font-weight: 700; color: #ffffff;">Choose Email Provider</h3>
                        <p style="margin: 2px 0 0 0; font-size: 0.85rem; color: #9ca3af;">Select how you want to compose emails.</p>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
                    <button class="ml-provider-option" data-provider="gmail" style="display: flex; align-items: center; width: 100%; padding: 14px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #ffffff; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" width="22" style="margin-right: 12px;">
                        <span>Gmail Web</span>
                    </button>
                    <button class="ml-provider-option" data-provider="outlook" style="display: flex; align-items: center; width: 100%; padding: 14px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #ffffff; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg" width="22" style="margin-right: 12px;">
                        <span>Outlook Web</span>
                    </button>
                    <button class="ml-provider-option" data-provider="yahoo" style="display: flex; align-items: center; width: 100%; padding: 14px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #ffffff; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="#6001d2" style="margin-right: 12px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                        <span>Yahoo Mail</span>
                    </button>
                    <button class="ml-provider-option" data-provider="native" style="display: flex; align-items: center; width: 100%; padding: 14px 16px; background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.2); border-radius: 12px; color: #d1d5db; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 12px; color: #9ca3af;"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                        <span>Default Mail App (Native)</span>
                    </button>
                </div>

                <label style="display: flex; align-items: center; margin-top: 18px; font-size: 0.85rem; color: #9ca3af; cursor: pointer; user-select: none;">
                    <input type="checkbox" id="ml-remember-choice" checked style="margin-right: 8px; accent-color: #e03616; width: 16px; height: 16px;">
                    Remember my choice on this device
                </label>
            </div>
        `;

        document.body.appendChild(modal);

        const style = document.createElement('style');
        style.textContent = `
            @keyframes mlFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            .ml-provider-option:hover { background: rgba(224, 54, 22, 0.2) !important; border-color: #e03616 !important; }
        `;
        document.head.appendChild(style);

        const closeModal = () => modal.remove();
        document.getElementById('ml-close-modal').onclick = closeModal;

        modal.querySelectorAll('.ml-provider-option').forEach(btn => {
            btn.onclick = () => {
                const choice = btn.dataset.provider;
                const remember = document.getElementById('ml-remember-choice').checked;
                if (remember) {
                    try { localStorage.setItem('maillayer_provider', choice); } catch (e) {}
                }
                closeModal();
                executeEmailAction(choice, data);
            };
        });
    };

    const handleMailLayerClick = (data, dataset = {}) => {
        // 1. Mobile devices: default to native mailto handling
        if (isMobile()) {
            executeEmailAction('native', data);
            return;
        }

        // 2. Explicit provider set on target element or global script tag config
        const explicitProvider = dataset.maillayerProvider || config.provider;
        if (explicitProvider) {
            executeEmailAction(explicitProvider, data);
            return;
        }

        // 3. Saved user preference in localStorage
        let savedProvider = null;
        try { savedProvider = localStorage.getItem('maillayer_provider'); } catch (e) {}
        if (savedProvider) {
            executeEmailAction(savedProvider, data);
            return;
        }

        // 4. First interaction on desktop: prompt user for preference
        promptProviderSelection(data);
    };

    document.addEventListener('click', (e) => {
        const mailto = e.target.closest('a[href^="mailto:"]');
        const trigger = e.target.closest('.maillayer-trigger');
        if (mailto || trigger) {
            if (isMobile() && mailto) {
                // Allow default native click navigation on mobile for mailto links
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            if (mailto) {
                handleMailLayerClick(parseMailtoUrl(mailto.href), mailto.dataset);
            } else {
                handleMailLayerClick({
                    to: trigger.dataset.maillayerTo || '',
                    cc: trigger.dataset.maillayerCc || '',
                    bcc: trigger.dataset.maillayerBcc || '',
                    subject: trigger.dataset.maillayerSubject || '',
                    body: trigger.dataset.maillayerBody || ''
                }, trigger.dataset);
            }
        }
    }, true);

    const initMagicUX = () => {
        if (!config.autoDetect) return;
        const style = document.createElement('style');
        style.textContent = `.maillayer-magic-link{color:${config.autoLinkColor};border-bottom:1px solid ${config.autoLinkColor}44;cursor:pointer;display:inline-flex;align-items:center;text-decoration:none;font-weight:500;transition:all .2s}.maillayer-magic-link:hover{border-bottom-color:${config.autoLinkColor};background:${config.autoLinkColor}11;border-radius:4px}`;
        document.head.appendChild(style);

        const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
        const skipTags = ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'A', 'BUTTON', 'NOSCRIPT', 'IFRAME', 'SVG'];

        const scan = (node) => {
            const textNodes = [];
            const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
                acceptNode: (n) => (n.parentNode && skipTags.includes(n.parentNode.nodeName)) || n.parentNode?.classList?.contains('maillayer-magic-link') ? NodeFilter.FILTER_REJECT : emailRegex.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
            });
            while (walker.nextNode()) textNodes.push(walker.currentNode);
            textNodes.forEach(n => {
                const span = document.createElement('span');
                span.innerHTML = n.nodeValue.replace(emailRegex, (match) => `<span class="maillayer-magic-link" data-maillayer-to="${match}">${match} <svg width="12" height="12" viewBox="0 0 24 24" fill="${config.autoLinkColor}" style="vertical-align:middle;margin-left:2px;"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg></span>`);
                n.parentNode.replaceChild(span, n);
            });
        };

        scan(document.body);
        new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 ? scan(n) : n.nodeType === 3 && n.parentNode && scan(n.parentNode)))).observe(document.body, { childList: true, subtree: true });

        document.addEventListener('click', (e) => {
            const link = e.target.closest('.maillayer-magic-link');
            if (link) {
                if (isMobile()) return; // Let default or native action occur
                e.preventDefault();
                e.stopPropagation();
                handleMailLayerClick({ to: link.dataset.maillayerTo }, link.dataset);
            }
        }, true);
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMagicUX);
    else initMagicUX();
})();
