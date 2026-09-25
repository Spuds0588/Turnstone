/*!
 * PhoneLayer Embedded v1.9.1
 * Zero-dependency drop-in library that upgrades tel: and sms: links on
 * desktop, and falls back to native OS dialing on mobile.
 * Docs: see PRD-PhoneLayer_Embedded.md and the index.html demo.
 */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * Mobile detection — native OS dialing wins on phones. Real tel:/sms: *
   * links pass through untouched; declarative triggers (no href) are    *
   * synthesized into tel:/sms: links in onClick.                        *
   * ------------------------------------------------------------------ */
  function isMobile() {
    try {
      if (navigator.userAgentData && typeof navigator.userAgentData.mobile === "boolean") {
        return navigator.userAgentData.mobile;
      }
    } catch (e) {
      /* fall through to UA sniffing */
    }
    return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
  }

  /* ------------------------------------------------------------------ *
   * Configuration (script-tag attributes)                              *
   * ------------------------------------------------------------------ */
  var script = document.currentScript || document.querySelector('script[src*="phonelayer"]');
  var CONFIG = {
    color: (script && script.getAttribute("data-phonelayer-color")) || "#7c5cff",
    theme: (script && script.getAttribute("data-phonelayer-theme")) || "light",
  };

  var STORAGE_KEY = "phonelayer:choice";
  var POPUP_W = 600;
  var POPUP_H = 700;

  /* ------------------------------------------------------------------ *
   * Provider matrix (Tier 1 + Tier 2) — App routes use OS URI schemes, *
   * Web routes open a centered popup.                                   *
   * ------------------------------------------------------------------ */
  var PROVIDERS = [
    {
      id: "os",
      name: "OS Default",
      kind: "app",
      types: ["call", "sms"],
      build: function (n, t, b) {
        return t === "sms" ? "sms:" + n + (b ? "?body=" + encodeURIComponent(b) : "") : "tel:" + n;
      },
    },
    {
      id: "facetime",
      name: "FaceTime",
      kind: "app",
      types: ["call"],
      build: function (n) {
        return "facetime://" + n;
      },
    },
    {
      id: "microsoft-phone",
      name: "Microsoft Phone Link",
      kind: "app",
      types: ["call", "sms"],
      build: function (n, t) {
        return t === "sms" ? "ms-phone://send?number=" + n : "ms-phone://call?number=" + n;
      },
    },
    {
      id: "whatsapp-app",
      name: "WhatsApp",
      kind: "app",
      types: ["call", "sms"],
      build: function (n, t, b) {
        return "whatsapp://send?phone=" + n + (t === "sms" && b ? "&text=" + encodeURIComponent(b) : "");
      },
    },
    {
      id: "whatsapp-web",
      name: "WhatsApp",
      kind: "web",
      types: ["call", "sms"],
      build: function (n, t, b) {
        return "https://wa.me/" + n + (t === "sms" && b ? "?text=" + encodeURIComponent(b) : "");
      },
    },
    {
      id: "google-voice",
      name: "Google Voice",
      kind: "web",
      types: ["call", "sms"],
      build: function (n, t) {
        return t === "sms"
          ? "https://voice.google.com/u/0/messages?sendto=" + n
          : "https://voice.google.com/u/0/calls?a=nc," + n;
      },
    },
    {
      id: "zoom-phone",
      name: "Zoom Phone",
      kind: "app",
      types: ["call", "sms"],
      build: function (n, t) {
        return (t === "sms" ? "zoomphonesms://" : "zoomphonecall://") + n;
      },
    },
    {
      id: "ringcentral",
      name: "RingCentral",
      kind: "app",
      types: ["call", "sms"],
      build: function (n, t) {
        return "rcmobile://" + (t === "sms" ? "sms" : "call") + "?number=" + n.replace(/^\+/, "");
      },
    },
    {
      id: "dialpad",
      name: "Dialpad",
      kind: "web",
      types: ["call"],
      build: function (n) {
        return "https://dialpad.com/app/dialpad?number=" + n;
      },
    },
    {
      id: "skype",
      name: "Skype",
      kind: "app",
      types: ["call", "sms"],
      build: function (n, t) {
        return "skype:" + n + (t === "sms" ? "?chat" : "?call");
      },
    },
    {
      id: "textmagic",
      name: "TextMagic",
      kind: "web",
      types: ["sms"],
      build: function (n) {
        return "https://my.textmagic.com/online/send-message?phone=" + n;
      },
    },
    {
      id: "teams",
      name: "Microsoft Teams",
      kind: "web",
      types: ["call"],
      build: function (n) {
        return "https://teams.microsoft.com/l/call/0/0?users=4:" + n;
      },
    },
    {
      id: "webex",
      name: "Cisco Webex",
      kind: "app",
      types: ["call"],
      build: function (n) {
        return "webextel:" + n;
      },
    },
    {
      id: "openphone",
      name: "OpenPhone",
      kind: "web",
      types: ["call", "sms"],
      build: function () {
        return "https://app.openphone.com";
      },
    },
    {
      id: "aircall",
      name: "Aircall",
      kind: "web",
      types: ["call", "sms"],
      build: function () {
        return "https://app.aircall.io";
      },
    },
    {
      id: "8x8",
      name: "8x8",
      kind: "web",
      types: ["call", "sms"],
      build: function () {
        return "https://work.8x8.com";
      },
    },
    {
      id: "goto-connect",
      name: "GoTo Connect",
      kind: "web",
      types: ["call", "sms"],
      build: function () {
        return "https://app.goto.com";
      },
    },
    {
      id: "vonage",
      name: "Vonage",
      kind: "web",
      types: ["call", "sms"],
      build: function () {
        return "https://app.vonage.com";
      },
    },
    {
      id: "nextiva",
      name: "Nextiva",
      kind: "web",
      types: ["call", "sms"],
      build: function () {
        return "https://app.nextiva.com";
      },
    },
    {
      id: "ooma",
      name: "Ooma",
      kind: "web",
      types: ["call", "sms"],
      build: function () {
        return "https://office.ooma.com";
      },
    },
    {
      id: "telegram",
      name: "Telegram",
      kind: "app",
      types: ["sms"],
      build: function (n, t, b) {
        return "tg://resolve?phone=" + n + (t === "sms" && b ? "&text=" + encodeURIComponent(b) : "");
      },
    },
    {
      id: "signal",
      name: "Signal",
      kind: "app",
      types: ["sms"],
      build: function (n) {
        return "sgnl://signal.me/#p/" + n;
      },
    },
    {
      id: "viber",
      name: "Viber",
      kind: "app",
      types: ["sms"],
      build: function (n) {
        return "viber://chat?number=" + n;
      },
    },
    {
      id: "five9",
      name: "Five9",
      kind: "web",
      types: ["call", "sms"],
      build: function () {
        return "https://app.five9.com";
      },
    },
    {
      id: "genesys",
      name: "Genesys Cloud",
      kind: "web",
      types: ["call", "sms"],
      build: function () {
        return "https://apps.mypurecloud.com";
      },
    },
    {
      id: "zoho-voice",
      name: "Zoho Voice",
      kind: "web",
      types: ["call", "sms"],
      build: function () {
        return "https://voice.zoho.com";
      },
    },
    {
      id: "justcall",
      name: "JustCall",
      kind: "web",
      types: ["call", "sms"],
      build: function () {
        return "https://app.justcall.io";
      },
    },
    {
      id: "telnyx",
      name: "Telnyx",
      kind: "web",
      types: ["sms"],
      build: function () {
        return "https://portal.telnyx.com";
      },
    },
    {
      id: "sinch",
      name: "Sinch",
      kind: "web",
      types: ["sms"],
      build: function () {
        return "https://dashboard.sinch.com";
      },
    },
    {
      id: "google-messages",
      name: "Google Messages",
      kind: "web",
      types: ["sms"],
      build: function () {
        return "https://messages.google.com/web";
      },
    },
    {
      id: "twilio",
      name: "Twilio",
      kind: "web",
      types: ["sms"],
      build: function () {
        return "https://console.twilio.com";
      },
    },
    {
      id: "textnow",
      name: "TextNow",
      kind: "web",
      types: ["call", "sms"],
      build: function () {
        return "https://www.textnow.com";
      },
    },
    {
      id: "callrail",
      name: "CallRail",
      kind: "web",
      types: ["sms"],
      build: function () {
        return "https://app.callrail.com";
      },
    },
    {
      id: "simpletexting",
      name: "SimpleTexting",
      kind: "web",
      types: ["sms"],
      build: function () {
        return "https://app.simpletexting.com";
      },
    },
    {
      id: "heymarket",
      name: "Heymarket",
      kind: "web",
      types: ["sms"],
      build: function () {
        return "https://app.heymarket.com";
      },
    },
    {
      id: "kixie",
      name: "Kixie",
      kind: "web",
      types: ["call", "sms"],
      build: function () {
        return "https://app.kixie.com";
      },
    },
    {
      id: "toky",
      name: "Toky",
      kind: "web",
      types: ["call", "sms"],
      build: function () {
        return "https://app.toky.co";
      },
    },
    {
      id: "sonetel",
      name: "Sonetel",
      kind: "web",
      types: ["call", "sms"],
      build: function () {
        return "https://app.sonetel.com";
      },
    },
    {
      id: "onsip",
      name: "OnSIP",
      kind: "web",
      types: ["call"],
      build: function () {
        return "https://www.onsip.com/uc";
      },
    },
    {
      id: "plivo",
      name: "Plivo",
      kind: "web",
      types: ["sms"],
      build: function () {
        return "https://console.plivo.com";
      },
    },
    {
      id: "infobip",
      name: "Infobip",
      kind: "web",
      types: ["sms"],
      build: function () {
        return "https://portal.infobip.com";
      },
    },
    {
      id: "clicksend",
      name: "ClickSend",
      kind: "web",
      types: ["sms"],
      build: function () {
        return "https://dashboard.clicksend.com";
      },
    },
    {
      id: "podium",
      name: "Podium",
      kind: "web",
      types: ["sms"],
      build: function () {
        return "https://app.podium.com";
      },
    },
    {
      id: "google-messages-app",
      name: "Google Messages",
      kind: "app",
      types: ["sms"],
      build: function (n, t, b) {
        return "google-messages://send?phone=" + n + (t === "sms" && b ? "&body=" + encodeURIComponent(b) : "");
      },
    },
    {
      id: "discord",
      name: "Discord",
      kind: "app",
      types: ["call", "sms"],
      build: function (n, t) {
        return t === "sms" ? "discord://smessage?number=" + n : "discord://call?number=" + n;
      },
    },
    {
      id: "facebook-messenger",
      name: "Messenger",
      kind: "app",
      types: ["call", "sms"],
      build: function (n, t) {
        return t === "sms" ? "fb-messenger://send?phone=" + n : "fb-messenger://call?phone=" + n;
      },
    },
    {
      id: "microsoft-teams-app",
      name: "Microsoft Teams",
      kind: "app",
      types: ["call"],
      build: function (n) {
        return "msteams://l/call/0/0?users=4:" + n;
      },
    },
    {
      id: "slack",
      name: "Slack",
      kind: "app",
      types: ["call"],
      build: function (n) {
        return "slack://call?number=" + n;
      },
    },
    {
      id: "webex-app",
      name: "Cisco Webex",
      kind: "app",
      types: ["call"],
      build: function (n) {
        return "webex://call?number=" + n;
      },
    },
  ];

  /* ------------------------------------------------------------------ *
   * Number sanitization — drop everything that is not a digit,          *
   * keeping a single leading "+".                                       *
   * ------------------------------------------------------------------ */
  function cleanNumber(raw) {
    return raw.replace(/(?!^\+)[^\d]/g, "");
  }

  /* ------------------------------------------------------------------ *
   * Storage helpers (localStorage may be unavailable in sandboxes).     *
   * ------------------------------------------------------------------ */
  function getPref() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function setPref(pref) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pref));
    } catch (e) {
      /* ignore */
    }
  }

  /* ------------------------------------------------------------------ *
   * Routing — apps via location.href, web apps via centered popup.      *
   * ------------------------------------------------------------------ */
  function route(provider, number, type, body) {
    var url = provider.build(number, type, body);
    if (provider.kind === "web") {
      var left = Math.max(0, Math.round((screen.width - POPUP_W) / 2));
      var top = Math.max(0, Math.round((screen.height - POPUP_H) / 2));
      window.open(url, "_blank", "width=" + POPUP_W + ",height=" + POPUP_H + ",left=" + left + ",top=" + top);
    } else {
      window.location.href = url;
    }
  }

  /* ------------------------------------------------------------------ *
   * Modal UI — built lazily, repopulated per open.                      *
   * ------------------------------------------------------------------ */
  var overlay = null;
  var modal = null;
  var search = null;
  var list = null;
  var remember = null;
  var pending = null; // { raw, number, type, body, color, theme }

  function css() {
    return (
      "#phonelayer-css{display:none}" +
      ".pl-overlay{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;background:rgba(10,12,16,.55);backdrop-filter:blur(4px);animation:pl-fade .15s ease}" +
      "@keyframes pl-fade{from{opacity:0}to{opacity:1}}" +
      ".pl-modal{width:min(420px,calc(100vw - 32px));max-height:min(640px,calc(100vh - 48px));display:flex;flex-direction:column;border-radius:16px;padding:20px;font:14px/1.5 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:var(--pl-text,#1a1d21);background:var(--pl-surface,#ffffff);border:1px solid var(--pl-border,#e4e7eb);box-shadow:0 24px 64px rgba(0,0,0,.28);animation:pl-pop .18s cubic-bezier(.2,.9,.3,1.2)}" +
      "@keyframes pl-pop{from{transform:translateY(10px) scale(.97);opacity:0}to{transform:none;opacity:1}}" +
      ".pl-modal[data-pl-theme=dark]{--pl-text:#eef1f4;--pl-surface:#161a20;--pl-border:#2a3038;--pl-muted:#9aa3ad;--pl-row:#1d222a}" +
      ".pl-title{margin:0 0 2px;font-size:16px;font-weight:700;color:var(--pl-text,#1a1d21)}" +
      ".pl-subtitle{margin:0 0 14px;font-size:12.5px;color:var(--pl-muted,#6b7280)}" +
      ".pl-close{position:absolute;top:14px;right:14px;width:30px;height:30px;border:0;border-radius:8px;background:transparent;color:var(--pl-muted,#6b7280);font-size:20px;line-height:1;cursor:pointer}" +
      ".pl-close:hover{background:var(--pl-row,#f0f2f4);color:var(--pl-text,#1a1d21)}" +
      ".pl-search{width:100%;box-sizing:border-box;margin-bottom:12px;padding:9px 12px;border-radius:10px;border:1px solid var(--pl-border,#e4e7eb);background:var(--pl-row,#f7f8fa);color:var(--pl-text,#1a1d21);font:inherit;outline:none}" +
      ".pl-search:focus{border-color:var(--pl-primary,#7c5cff);box-shadow:0 0 0 3px color-mix(in srgb,var(--pl-primary,#7c5cff) 18%,transparent)}" +
      ".pl-list{display:flex;flex-direction:column;gap:6px;overflow-y:auto;margin-bottom:14px;padding-right:2px}" +
      ".pl-provider{position:relative;display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--pl-text,#1a1d21);font:inherit;text-align:left;cursor:pointer}" +
      ".pl-provider:hover{border-color:color-mix(in srgb,var(--pl-primary,#7c5cff) 45%,transparent);background:color-mix(in srgb,var(--pl-primary,#7c5cff) 7%,transparent)}" +
      ".pl-provider-name{font-weight:600}" +
      ".pl-provider-hint{margin-left:auto;font-size:11.5px;color:var(--pl-muted,#6b7280);white-space:nowrap}" +
      ".pl-badge{flex:none;padding:2px 7px;border-radius:999px;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}" +
      ".pl-badge-app{background:color-mix(in srgb,var(--pl-primary,#7c5cff) 14%,transparent);color:var(--pl-primary,#7c5cff)}" +
      ".pl-badge-web{background:var(--pl-row,#f0f2f4);color:var(--pl-muted,#6b7280)}" +
      ".pl-remember{display:flex;align-items:center;gap:8px;padding-top:12px;border-top:1px solid var(--pl-border,#e4e7eb);font-size:13px;color:var(--pl-muted,#6b7280);cursor:pointer}" +
      ".pl-remember input{accent-color:var(--pl-primary,#7c5cff);cursor:pointer}"
    );
  }

  function ensureUi() {
    if (overlay) return;
    var style = document.createElement("style");
    style.id = "phonelayer-css";
    style.textContent = css();
    document.head.appendChild(style);

    overlay = document.createElement("div");
    overlay.className = "pl-overlay";
    overlay.setAttribute("role", "presentation");
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });

    modal = document.createElement("div");
    modal.className = "pl-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Choose a provider");

    var closeBtn = document.createElement("button");
    closeBtn.className = "pl-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", close);

    search = document.createElement("input");
    search.className = "pl-search";
    search.type = "search";
    search.placeholder = "Search providers…";
    search.addEventListener("input", renderList);

    list = document.createElement("div");
    list.className = "pl-list";

    remember = document.createElement("label");
    remember.className = "pl-remember";
    var box = document.createElement("input");
    box.type = "checkbox";
    remember.appendChild(box);
    remember.appendChild(document.createTextNode("Remember my choice"));

    modal.appendChild(closeBtn);
    modal.appendChild(search);
    modal.appendChild(list);
    modal.appendChild(remember);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay && overlay.style.display !== "none") close();
    });
  }

  function open(raw, number, type, body, overrides) {
    pending = { raw: raw, number: number, type: type, body: body, color: overrides.color, theme: overrides.theme };
    ensureUi();
    var title = document.createElement("h2");
    title.className = "pl-title";
    title.textContent = (type === "sms" ? "Text " : "Call ") + raw;

    var subtitle = document.createElement("p");
    subtitle.className = "pl-subtitle";
    subtitle.textContent = "Route to " + (type === "sms" ? "an SMS" : "a call") + " provider — sanitized to " + number;

    modal.setAttribute("data-pl-theme", pending.theme || CONFIG.theme);
    modal.style.setProperty("--pl-primary", pending.color || CONFIG.color);
    modal.setAttribute("data-clean", number);
    modal.setAttribute("data-type", type);
    modal.insertBefore(subtitle, modal.firstChild);
    modal.insertBefore(title, modal.firstChild);

    search.value = "";
    remember.querySelector("input").checked = false;
    renderList();
    overlay.style.display = "flex";
    search.focus();
  }

  function renderList() {
    var q = (search.value || "").toLowerCase();
    list.textContent = "";
    var match = false;
    PROVIDERS.forEach(function (p) {
      if (p.types.indexOf(pending.type) === -1) return;
      if (q && p.name.toLowerCase().indexOf(q) === -1) return;
      match = true;
      var row = document.createElement("button");
      row.className = "pl-provider";
      row.setAttribute("data-id", p.id);
      row.setAttribute("data-kind", p.kind);
      row.setAttribute("data-url", p.build(pending.number, pending.type, pending.body));

      var name = document.createElement("span");
      name.className = "pl-provider-name";
      name.textContent = p.name;

      var badge = document.createElement("span");
      badge.className = "pl-badge pl-badge-" + p.kind;
      badge.textContent = p.kind === "app" ? "App" : "Web";

      var hint = document.createElement("span");
      hint.className = "pl-provider-hint";
      hint.textContent = p.kind === "web" ? "May require sign-in" : "Launches desktop app";

      row.appendChild(name);
      row.appendChild(badge);
      row.appendChild(hint);
      row.addEventListener("click", function () {
        if (remember.querySelector("input").checked) {
          setPref({ t: pending.type, p: p.id });
        }
        close();
        route(p, pending.number, pending.type, pending.body);
      });
      list.appendChild(row);
    });
    if (!match) {
      var none = document.createElement("p");
      none.style.cssText = "margin:8px 0;color:var(--pl-muted,#6b7280);font-size:13px";
      none.textContent = "No providers match \"" + search.value + "\"";
      list.appendChild(none);
    }
  }

  function close() {
    if (!overlay) return;
    overlay.style.display = "none";
    modal.querySelector(".pl-title") && modal.querySelector(".pl-title").remove();
    modal.querySelector(".pl-subtitle") && modal.querySelector(".pl-subtitle").remove();
  }

  /* ------------------------------------------------------------------ *
   * Click interception                                                  *
   * ------------------------------------------------------------------ */
  function onClick(e) {
    var el = e.target.closest('a[href^="tel:"],a[href^="sms:"],.phonelayer-trigger,[data-phonelayer-to]');
    if (!el) return;

    var raw, type;
    var attr = el.getAttribute("data-phonelayer-to");
    if (attr) {
      raw = attr;
      type = /^sms:/i.test(attr) ? "sms" : "call";
    } else {
      var href = el.getAttribute("href");
      type = /^sms:/i.test(href) ? "sms" : "call";
      var m = href.match(/^[a-z]+:(.*)$/i);
      raw = m ? m[1].split("?")[0] : href;
    }

    // SMS body from the href query string (e.g. sms:+1555...?body=Hi)
    var body = null;
    if (type === "sms") {
      var q = (el.getAttribute("href") || "").split("?")[1];
      if (q) body = new URLSearchParams(q).get("body");
    }

    var number = cleanNumber(raw);
    if (!number) return;

    // Mobile: real tel:/sms: links reach the native OS handler untouched;
    // declarative triggers (no href, or placeholder "#") get a synthesized
    // tel:/sms: link so they dial instead of doing nothing.
    if (isMobile()) {
      var href = el.getAttribute("href");
      if (href && href !== "#") return;
      e.preventDefault();
      window.location.href =
        type === "sms"
          ? "sms:" + number + (body ? "?body=" + encodeURIComponent(body) : "")
          : "tel:" + number;
      return;
    }

    e.preventDefault();

    // Remembered preference → route straight through, no modal.
    var pref = getPref();
    if (pref && pref.t === type) {
      for (var i = 0; i < PROVIDERS.length; i++) {
        if (PROVIDERS[i].id === pref.p && PROVIDERS[i].types.indexOf(type) !== -1) {
          route(PROVIDERS[i], number, type, body);
          return;
        }
      }
    }

    open(raw, number, type, body, {
      color: el.getAttribute("data-phonelayer-color"),
      theme: el.getAttribute("data-phonelayer-theme"),
    });
  }

  function init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        document.addEventListener("click", onClick);
      });
    } else {
      document.addEventListener("click", onClick);
    }
  }

  /* ------------------------------------------------------------------ *
   * Public API — one global, for debugging / preference reset.          *
   * ------------------------------------------------------------------ */
  window.PhoneLayer = {
    version: "1.9.1",
    reset: function () {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        /* ignore */
      }
    },
  };

  init();
})();