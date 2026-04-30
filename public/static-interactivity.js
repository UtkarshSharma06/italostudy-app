/**
 * ItaloStudy — Static Interactivity Script
 * GDPR-compliant cookie consent + mobile menu for static HTML clones.
 * Replaces the dead React CookieConsent component with a fully functional
 * Vanilla JS equivalent including Manage Preferences with toggle switches.
 */

(function () {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    var COOKIE_KEY = 'italostudy_cookie_consent';

    /* ─── URL Utilities ────────────────────────────────────────── */
    function getProxiedUrl(url) {
        if (!url) return '';
        if (url.startsWith('data:')) return url;
        
        // If it's already a full URL including protocol, return as is (or handle specific proxies)
        if (url.startsWith('http')) {
            // Optional: Add logic here if specific transformations are needed for Cloudinary/Supabase
            return url;
        }
        
        // Handle Supabase/Relative paths if any
        return url;
    }

    /* ─── Translations ──────────────────────────────────────────── */
    var T = {
        en: {
            title: 'Cookie Preferences',
            badge: 'GDPR \u00b7 EU Standard',
            desc: 'We use cookies to improve your experience and personalise content. You can manage your choices below.',
            privacy: 'Privacy Policy',
            accept: 'Accept All Cookies',
            reject: 'Reject Optional',
            manage: 'Manage',
            save: 'Save Choices',
            necessary: 'Necessary',
            necessaryDesc: 'Core site functions. Always active.',
            required: 'Required',
            analytics: 'Analytics',
            analyticsDesc: 'Helps us understand site usage.',
            marketing: 'Marketing',
            marketingDesc: 'Personalised ads across websites.'
        },
        it: {
            title: 'Preferenze Cookie',
            badge: 'GDPR \u00b7 Standard UE',
            desc: 'Utilizziamo i cookie per migliorare la tua esperienza e personalizzare i contenuti. Puoi gestire le tue scelte qui sotto.',
            privacy: 'Privacy Policy',
            accept: 'Accetta Tutti',
            reject: 'Rifiuta Opzionali',
            manage: 'Gestisci',
            save: 'Salva Scelte',
            necessary: 'Necessari',
            necessaryDesc: 'Funzioni essenziali del sito. Sempre attivi.',
            required: 'Obbligatorio',
            analytics: 'Analitici',
            analyticsDesc: 'Ci aiutano a capire come viene utilizzato il sito.',
            marketing: 'Marketing',
            marketingDesc: 'Annunci personalizzati su diversi siti web.'
        },
        tr: {
            title: '\u00c7erez Tercihleri',
            badge: 'GDPR \u00b7 AB Standard\u0131',
            desc: 'Deneyiminizi geli\u015ftirmek ve i\u00e7eri\u011fi ki\u015fiselle\u015ftirmek i\u00e7in \u00e7erezler kullan\u0131yoruz. Se\u00e7imlerinizi a\u015fa\u011f\u0131dan y\u00f6netebilirsiniz.',
            privacy: 'Gizlilik Politikas\u0131',
            accept: 'Hepsini Kabul Et',
            reject: '\u0130ste\u011fe Ba\u011fl\u0131 Reddet',
            manage: 'Y\u00f6net',
            save: 'Se\u00e7imleri Kaydet',
            necessary: 'Gerekli',
            necessaryDesc: 'Temel site i\u015flevleri. Her zaman aktif.',
            required: 'Zorunlu',
            analytics: 'Analitik',
            analyticsDesc: 'Site kullan\u0131m\u0131n\u0131 anlamamıza yard\u0131mc\u0131 olur.',
            marketing: 'Pazarlama',
            marketingDesc: 'Web sitelerinde ki\u015fisel reklamlar.'
        }
    };

    /* ─── Init ──────────────────────────────────────────────────── */
    function init() {
        console.log('--- Static Interactivity Re-hydrated ---');
        killGhostModals();
        initCookieBanner();
        initMobileMenu();
        initHeaderScroll();
        initNavDropdowns();
        initBlog();
        initMocks();
        initAnnouncementBar();
    }

    /* ─── Global Announcement Bar ─────────────────────────────── */
    function initAnnouncementBar() {
        var SUPABASE_URL = 'https://jyjhpqtqbwtxxgijxetq.supabase.co';
        var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5amhwcXRxYnd0eHhnaWp4ZXRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTgyNjUsImV4cCI6MjA4MzE5NDI2NX0.5HaHhfgPQbIRKmHZE61ggrtj-lKi5JlBU9tsOfQ_d3c';
        
        var path = window.location.pathname;
        var isImat = path.includes('imat');
        var isCents = path.includes('cent-s');
        var isStore = path.includes('store');

        fetch(SUPABASE_URL + '/rest/v1/site_announcements?is_active=eq.true&order=created_at.desc', {
            headers: {
                'apikey': ANON_KEY,
                'Authorization': 'Bearer ' + ANON_KEY
            }
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (!data || data.length === 0) return;

            var active = null;
            if (isStore) active = data.find(function(a) { return a.page_target === 'store'; });
            else if (isImat) active = data.find(function(a) { return a.page_target === 'imat'; });
            else if (isCents) active = data.find(function(a) { return a.page_target === 'cents'; });
            
            if (!active) active = data.find(function(a) { return a.page_target === 'global'; });
            
            if (active) renderAnnouncement(active);
        })
        .catch(function(err) { console.error('Announcement Error:', err); });

        function renderAnnouncement(a) {
            var bar = document.createElement('div');
            bar.id = 'dynamic-announcement-bar';
            bar.style.width = '100%';
            bar.style.position = 'relative';
            bar.style.zIndex = '1001';
            
            var content = a.content;
            var btnText = a.button_text || '';
            var bgColor = a.bg_color || '#4f46e5';
            var textColor = a.text_color || '#ffffff';
            var link = a.link_url || '#';

            var html = '';
            if (a.template_id === 'ticker') {
                html = '<div style="background:'+bgColor+'; color:'+textColor+'; overflow:hidden; white-space:nowrap; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; padding:10px 0;">' +
                       '<div class="ticker-content" style="display:inline-block; animation: ticker-scroll 20s linear infinite; padding-left: 100%;">' +
                       content + ' &nbsp; • &nbsp; ' + content + ' &nbsp; • &nbsp; ' + content + ' &nbsp; • &nbsp; ' + content + 
                       '</div></div>';
                var style = document.createElement('style');
                style.innerHTML = '@keyframes ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }';
                document.head.appendChild(style);
            } else {
                html = '<div style="background:'+bgColor+'; color:'+textColor+'; padding:12px 20px; display:flex; align-items:center; justify-content:center; gap:15px; text-align:center; font-size:12px; font-weight:700; border-bottom: 1px solid rgba(0,0,0,0.1);">' +
                       '<span>' + content + '</span>' +
                       (btnText ? '<a href="'+link+'" style="background:rgba(255,255,255,0.2); color:inherit; padding:5px 15px; border-radius:99px; text-decoration:none; font-size:10px; font-weight:900; text-transform:uppercase; transition: all 0.3s;" onmouseover="this.style.background=\'rgba(255,255,255,0.3)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.2)\'">'+btnText+'</a>' : '') +
                       '</div>';
            }

            bar.innerHTML = html;
            document.body.prepend(bar);

            // Push fixed header down
            setTimeout(function() {
                var header = document.querySelector('header.fixed');
                if (header) {
                    var h = bar.offsetHeight;
                    header.style.transition = 'top 0.3s ease';
                    header.style.top = h + 'px';
                }
            }, 100);
        }
    }

    /* ─── Header Scroll Animation ────────────────────────────── */
    function initHeaderScroll() {
        var header = document.querySelector('header.fixed');
        var container = header ? header.querySelector('.container') : null;
        if (!header) return;

        function update() {
            if (window.scrollY > 20) {
                header.classList.add('scrolled');
                if (container) {
                    container.classList.remove('md:h-24');
                    container.classList.add('md:h-16');
                }
            } else {
                header.classList.remove('scrolled');
                if (container) {
                    container.classList.remove('md:h-16');
                    container.classList.add('md:h-24');
                }
            }
        }

        window.addEventListener('scroll', update);
        update(); // Initial check
    }

    /* ─── Nav Dropdowns (Desktop) ────────────────────────────── */
    function initNavDropdowns() {
        console.log('[static] Initializing Nav Dropdowns');
        var triggers = document.querySelectorAll('.nav-dropdown-trigger');
        if (triggers.length === 0) console.warn('[static] No nav-dropdown-trigger found');

        triggers.forEach(function (trigger) {
            var menu = trigger.querySelector('.nav-dropdown-menu');
            if (!menu) return;

            var timeout;
            var isVisible = false;

            function show() {
                clearTimeout(timeout);
                if (isVisible) return;
                isVisible = true;
                
                menu.classList.remove('hidden');
                menu.style.display = 'block';
                
                // Use requestAnimationFrame for smooth transition
                requestAnimationFrame(function() {
                    requestAnimationFrame(function() {
                        menu.style.opacity = '1';
                        menu.style.transform = 'translate(-50%, 0) scale(1)';
                        menu.classList.remove('opacity-0', 'scale-95');
                        menu.classList.add('opacity-100', 'scale-100');
                    });
                });
            }

            function hide() {
                timeout = setTimeout(function () {
                    isVisible = false;
                    menu.style.opacity = '0';
                    menu.style.transform = 'translate(-50%, 10px) scale(0.95)';
                    menu.classList.remove('opacity-100', 'scale-100');
                    menu.classList.add('opacity-0', 'scale-95');
                    
                    setTimeout(function() {
                        if (!isVisible) {
                            menu.style.display = 'none';
                            menu.classList.add('hidden');
                        }
                    }, 200);
                }, 150);
            }

            // Hover for desktop
            trigger.addEventListener('mouseenter', show);
            trigger.addEventListener('mouseleave', hide);

            // Click for mobile/fallback
            var link = trigger.querySelector('a');
            if (link) {
                link.addEventListener('click', function(e) {
                    if (window.innerWidth < 1024) {
                        // On mobile, the mobile menu handles things differently usually, 
                        // but if we're in desktop mode at small width, toggle it.
                        e.preventDefault();
                        isVisible ? hide() : show();
                    }
                });
            }
        });
    }

    /* ─── Kill ALL React ghost cookie modals ───────────────────── */
    function killGhostModals() {
        // Our banner hasn't been created yet, so we can safely nuke everything cookie-related.
        // Walk from deepest elements up so we catch the outermost wrapper.
        var found = [];
        document.querySelectorAll('div').forEach(function (el) {
            var txt = el.textContent || '';
            if (
                (txt.indexOf('Cookie Preferences') !== -1 ||
                 txt.indexOf('Preferenze Cookie') !== -1 ||
                 txt.indexOf('\u00c7erez Tercihleri') !== -1) &&
                (txt.indexOf('Accept') !== -1 || txt.indexOf('Accetta') !== -1 || txt.indexOf('Kabul') !== -1) &&
                el.querySelector('button')
            ) {
                found.push(el);
            }
        });
        // Remove the outermost match (it wraps inner ones)
        found.forEach(function (el) {
            if (el.parentNode) {
                el.remove();
                console.log('[static] Removed ghost cookie modal');
            }
        });
        // Also nuke by class patterns
        document.querySelectorAll('[class*="CookieConsent"], [data-sonner-toaster], [class*="sonner"]').forEach(function (el) {
            el.remove();
        });
    }

    /* ─── Cookie Banner (GDPR compliant) ───────────────────────── */
    function initCookieBanner() {
        if (localStorage.getItem(COOKIE_KEY)) return;

        var lang = (document.documentElement.getAttribute('lang') || 'en').substring(0, 2);
        var t = T[lang] || T.en;

        var prefs = { necessary: true, analytics: false, marketing: false };
        var expanded = false;

        // ── Create banner container ──
        var banner = document.createElement('div');
        banner.id = 'static-cookie-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', t.title);
        Object.assign(banner.style, {
            position: 'fixed', bottom: '12px', right: '12px', zIndex: '99999',
            width: '420px', maxWidth: 'calc(100vw - 24px)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            animation: 'scb-in 0.22s ease-out'
        });

        // Inject keyframe animation
        if (!document.getElementById('scb-keyframes')) {
            var styleEl = document.createElement('style');
            styleEl.id = 'scb-keyframes';
            styleEl.textContent =
                '@keyframes scb-in{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}' +
                '.scb-toggle{position:relative;display:inline-flex;width:44px;height:24px;border-radius:9999px;border:2px solid transparent;cursor:pointer;transition:background 0.15s;flex-shrink:0;}' +
                '.scb-toggle[aria-checked="true"]{background:#4f46e5;}' +
                '.scb-toggle[aria-checked="false"]{background:#e2e8f0;}' +
                '.scb-toggle[disabled]{opacity:0.5;cursor:not-allowed;}' +
                '.scb-toggle-knob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:9999px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.1);transition:transform 0.15s;}' +
                '.scb-toggle[aria-checked="true"] .scb-toggle-knob{transform:translateX(20px);}' +
                '.scb-btn{display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:12px;border:none;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;cursor:pointer;transition:background 0.1s,color 0.1s,transform 0.1s;}' +
                '.scb-btn:active{transform:scale(0.98);}' +
                '.scb-manage-panel{max-height:0;overflow:hidden;transition:max-height 0.28s cubic-bezier(0.4,0,0.2,1);}' +
                '.scb-manage-panel.open{max-height:500px;}';
            document.head.appendChild(styleEl);
        }

        function render() {
            banner.innerHTML =
                '<div style="border-radius:20px;background:#fff;border:1px solid #e2e8f0;box-shadow:0 20px 60px -10px rgba(0,0,0,0.18);overflow:hidden;">' +
                    '<div style="height:3px;background:linear-gradient(to right,#6366f1,#a855f7,#f43f5e);"></div>' +
                    '<div style="padding:20px;">' +
                        /* Header */
                        '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;">' +
                            '<div style="display:flex;align-items:center;gap:10px;">' +
                                '<div style="width:32px;height:32px;border-radius:12px;background:#eef2ff;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                                    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/></svg>' +
                                '</div>' +
                                '<div>' +
                                    '<p style="font-size:11px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:0.1em;line-height:1.2;margin:0;">' + t.title + '</p>' +
                                    '<p style="font-size:10px;color:#94a3b8;font-weight:600;margin:2px 0 0 0;">' + t.badge + '</p>' +
                                '</div>' +
                            '</div>' +
                            '<button id="scb-close" style="padding:6px;border-radius:12px;border:none;background:transparent;color:#cbd5e1;cursor:pointer;" aria-label="Close">' +
                                '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                            '</button>' +
                        '</div>' +
                        /* Description */
                        '<p style="font-size:12px;color:#64748b;font-weight:500;line-height:1.6;margin:0 0 16px 0;">' + t.desc +
                            ' <a href="/privacy" style="color:#4f46e5;font-weight:700;text-decoration:none;">' + t.privacy + '</a>' +
                        '</p>' +
                        /* Manage panel (collapsible) */
                        '<div id="scb-manage-panel" class="scb-manage-panel' + (expanded ? ' open' : '') + '">' +
                            '<div style="display:flex;flex-direction:column;gap:8px;padding-bottom:16px;">' +
                                renderCategory('necessary', t.necessary, t.necessaryDesc, true) +
                                renderCategory('analytics', t.analytics, t.analyticsDesc, false) +
                                renderCategory('marketing', t.marketing, t.marketingDesc, false) +
                            '</div>' +
                        '</div>' +
                        /* Buttons */
                        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
                            '<button id="scb-accept" class="scb-btn" style="grid-column:1/-1;background:#4f46e5;color:#fff;font-size:11px;padding:12px;box-shadow:0 4px 14px rgba(79,70,229,0.15);">' +
                                '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
                                t.accept +
                            '</button>' +
                            '<button id="scb-reject" class="scb-btn" style="background:#f1f5f9;color:#475569;">' + t.reject + '</button>' +
                            (expanded
                                ? '<button id="scb-save" class="scb-btn" style="background:#f1f5f9;color:#475569;">' + t.save + '</button>'
                                : '<button id="scb-manage" class="scb-btn" style="background:#f1f5f9;color:#475569;">' + t.manage +
                                    ' <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
                                  '</button>'
                            ) +
                        '</div>' +
                    '</div>' +
                '</div>';

            // Wire up events
            wire();
        }

        function renderCategory(key, title, desc, locked) {
            var checked = prefs[key];
            return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:12px;background:#f8fafc;border:1px solid #f1f5f9;">' +
                '<div style="display:flex;align-items:center;gap:10px;min-width:0;">' +
                    '<div style="width:28px;height:28px;border-radius:8px;background:#fff;border:1px solid #f1f5f9;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                        categoryIcon(key) +
                    '</div>' +
                    '<div style="min-width:0;">' +
                        '<p style="font-size:10px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
                            title +
                            (locked ? ' <span style="margin-left:6px;padding:1px 4px;background:#f1f5f9;color:#94a3b8;font-size:8px;border-radius:4px;font-weight:900;text-transform:uppercase;">' + (T[lang] || T.en).required + '</span>' : '') +
                        '</p>' +
                        '<p style="font-size:10px;color:#94a3b8;font-weight:500;margin:2px 0 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + desc + '</p>' +
                    '</div>' +
                '</div>' +
                '<button class="scb-toggle" role="switch" aria-checked="' + checked + '" data-key="' + key + '"' + (locked ? ' disabled' : '') + '>' +
                    '<span class="scb-toggle-knob"></span>' +
                '</button>' +
            '</div>';
        }

        function categoryIcon(key) {
            if (key === 'necessary') return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
            if (key === 'analytics') return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>';
            return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"/><path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"/></svg>';
        }

        function dismiss(p) {
            localStorage.setItem(COOKIE_KEY, JSON.stringify(p));
            banner.style.animation = 'none';
            banner.style.transition = 'opacity 0.2s, transform 0.2s';
            banner.style.opacity = '0';
            banner.style.transform = 'translateY(16px)';
            setTimeout(function () { banner.remove(); }, 220);
        }

        function wire() {
            var a = document.getElementById('scb-accept');
            var r = document.getElementById('scb-reject');
            var c = document.getElementById('scb-close');
            var m = document.getElementById('scb-manage');
            var s = document.getElementById('scb-save');

            if (a) a.addEventListener('click', function () {
                dismiss({ necessary: true, analytics: true, marketing: true });
            });
            if (r) r.addEventListener('click', function () {
                dismiss({ necessary: true, analytics: false, marketing: false });
            });
            if (c) c.addEventListener('click', function () {
                dismiss({ necessary: true, analytics: false, marketing: false });
            });
            if (m) m.addEventListener('click', function () {
                expanded = true;
                render();
            });
            if (s) s.addEventListener('click', function () {
                dismiss(prefs);
            });

            // Toggle switches
            document.querySelectorAll('.scb-toggle:not([disabled])').forEach(function (toggle) {
                toggle.addEventListener('click', function () {
                    var key = this.getAttribute('data-key');
                    prefs[key] = !prefs[key];
                    var isOn = prefs[key];
                    this.setAttribute('aria-checked', String(isOn));
                });
            });
        }

        document.body.appendChild(banner);
        render();
    }

    /* ─── Mobile Menu Toggle ───────────────────────────────────── */
    function initMobileMenu() {
        var openBtn = document.getElementById('mobile-menu-open');
        var closeBtn = document.getElementById('mobile-menu-close');
        var panel = document.getElementById('mobile-menu-panel');

        if (!openBtn || !panel) {
            // Fallback for legacy class-based detection
            openBtn = openBtn || document.querySelector('button.lg\\:hidden');
            if (openBtn && !panel) {
                var header = openBtn.closest('header');
                if (header) {
                    var divs = header.querySelectorAll('div');
                    for (var i = 0; i < divs.length; i++) {
                        if (divs[i].className && divs[i].className.indexOf('lg:hidden') !== -1 && divs[i].querySelectorAll('a').length > 3) {
                            panel = divs[i];
                            break;
                        }
                    }
                }
            }
        }

        if (openBtn && panel) {
            openBtn.addEventListener('click', function () {
                panel.classList.remove('hidden');
                panel.style.display = 'flex';
                document.body.style.overflow = 'hidden'; // Prevent scroll
            });

            if (closeBtn) {
                closeBtn.addEventListener('click', function () {
                    panel.classList.add('hidden');
                    panel.style.display = 'none';
                    document.body.style.overflow = '';
                });
            }

            // Close on link click
            panel.querySelectorAll('a').forEach(function(link) {
                link.addEventListener('click', function() {
                    panel.classList.add('hidden');
                    panel.style.display = 'none';
                    document.body.style.overflow = '';
                });
            });
        }
    }

    /* ─── Supabase Central Initialization ────────────────────────── */
    var SB_URL = 'https://jyjhpqtqbwtxxgijxetq.supabase.co';
    var SB_KEY = 'sb_publishable_LZduUlJ96GYtgyo0l-iTzw_P-8Glk_v';
    var _sbClient = null;

    function getSupabase() {
        if (_sbClient) return _sbClient;
        if (typeof window.supabase !== 'undefined') {
            _sbClient = window.supabase.createClient(SB_URL, SB_KEY);
            console.log('[Supabase] Client Initialized successfully.');
            return _sbClient;
        }
        console.error('[Supabase] Library not found in window.');
        return null;
    }

    /* ─── Blog Pagination & Filtering (Dynamic) ───────────────────────────── */
    function initBlog() {
        var grid = document.getElementById('blog-grid');
        if (!grid) return;

        var sb = getSupabase();
        if (!sb) return;

        var searchInput = document.getElementById('blog-search-input');
        var catBtns = Array.from(document.querySelectorAll('.blog-category-btn'));
        var prevBtn = document.getElementById('blog-prev-btn');
        var nextBtn = document.getElementById('blog-next-btn');
        var paginationWrapper = document.getElementById('blog-pagination');
        var scrollAnchor = document.getElementById('blog-search-input') || grid; 

        var POSTS_PER_PAGE = 15;
        var currentPage = 1;
        var currentCategory = 'all';
        var currentSearch = '';
        var allPosts = [];

        var emojiMap = { 'exams': '📝', 'life-abroad': '🌍', 'study-tips': '💡', 'imat': '🏥', 'tolc': '🎓' };

        grid.innerHTML = '<div class="col-span-full py-20 text-center"><div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mb-4"></div><p class="text-slate-500 font-bold">Syncing archives...</p></div>';

        async function fetchContent() {
            try {
                var { data, error } = await sb.from('blog_posts').select('*, blog_categories(name, slug)').order('created_at', { ascending: false });
                if (error) throw error;
                allPosts = data || [];
                render();
            } catch (err) { console.error('Blog Fetch Error:', err); }
        }

        function render() {
            var filtered = allPosts.filter(function(post) {
                var title = (post.title || '').toLowerCase();
                var cat = (post.blog_categories && post.blog_categories.slug) || 'none';
                return (currentSearch === '' || title.indexOf(currentSearch) !== -1) && (currentCategory === 'all' || cat === currentCategory);
            });

            var totalPages = Math.ceil(filtered.length / POSTS_PER_PAGE) || 1;
            if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
            var start = (currentPage - 1) * POSTS_PER_PAGE;

            if (filtered.length === 0) {
                grid.innerHTML = '<div class="col-span-full text-center py-24 bg-white border-2 border-dashed border-slate-200 rounded-[3rem]"><h3 class="text-2xl font-black text-slate-900 mb-2">No posts found</h3></div>';
            } else {
                grid.innerHTML = filtered.slice(start, start + POSTS_PER_PAGE).map(function(post, idx) {
                    var date = new Date(post.published_at || post.created_at);
                    var img = post.featured_image || '';
                    return '<div class="blog-post-card"><div class="group h-full flex flex-col bg-white rounded-[2rem] overflow-hidden border border-slate-100 hover:shadow-2xl transition-all"><a class="block relative aspect-video overflow-hidden" href="/blog/'+post.slug+'">' + (img ? '<img src="'+img+'" class="w-full h-full object-cover">' : '<div class="w-full h-full bg-slate-100"></div>') + '</a><div class="p-8 flex flex-col flex-1"><a href="/blog/'+post.slug+'" class="text-xl font-black text-slate-900 hover:text-indigo-600 transition-colors uppercase leading-tight mb-4">'+post.title+'</a><p class="text-slate-500 text-sm font-medium line-clamp-3 mb-6">'+(post.excerpt || '')+'</p><a href="/blog/'+post.slug+'" class="mt-auto bg-yellow-400 py-3 text-center text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-yellow-500 transition-colors">Read Article</a></div></div></div>';
                }).join('');
            }

            if (paginationWrapper) paginationWrapper.style.display = totalPages <= 1 ? 'none' : 'flex';
            if (prevBtn) prevBtn.disabled = currentPage === 1;
            if (nextBtn) nextBtn.disabled = currentPage === totalPages;
        }

        if (searchInput) searchInput.addEventListener('input', function(e) { currentSearch = e.target.value.toLowerCase(); currentPage = 1; render(); });
        catBtns.forEach(function(btn) { btn.addEventListener('click', function() { currentCategory = this.getAttribute('data-category'); currentPage = 1; render(); }); });
        if (prevBtn) prevBtn.addEventListener('click', function() { if (currentPage > 1) { currentPage--; render(); window.scrollTo({top: grid.offsetTop - 100, behavior: 'smooth'}); } });
        if (nextBtn) nextBtn.addEventListener('click', function() { if (currentPage < Math.ceil(allPosts.length / POSTS_PER_PAGE)) { currentPage++; render(); window.scrollTo({top: grid.offsetTop - 100, behavior: 'smooth'}); } });

        fetchContent();
    }

    /* ─── Mock Tests (CEnT-S & IMAT)  ───────────────────────────── */
    function initMocks() {
        var path = window.location.pathname.toLowerCase();
        var isCents = path.indexOf('cent-s-mock') !== -1;
        var isImat = path.indexOf('imat-mock') !== -1;
        if (!isCents && !isImat) return;

        var container = document.getElementById('mock-list-container');
        if (!container) return;

        var sb = getSupabase();
        if (!sb) {
            container.innerHTML = '<div class="text-center py-20 text-red-500 font-bold uppercase tracking-widest text-[10px]">Registry Link Offline</div>';
            return;
        }

        var examType = isCents ? 'cent-s-prep' : 'imat-prep';
        console.log('[MockSync] Initializing for ' + examType);

        container.innerHTML = '<div class="flex flex-col items-center justify-center py-32"><div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mb-6"></div><p class="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Syncing Portal Data...</p></div>';

        var isLogged = !!window.__IS_LOGGED_IN;
        var currentFilter = 'all';
        var sessions = [];
        var allSeries = [];
        var selectedSeries = null;

        window.handleStartSimulation = function(id, past) {
            if (!isLogged) { window.location.href = '/auth'; return; }
            window.location.href = past ? '/mock-guidelines?session_id='+id+'&exam_type='+examType : '/waiting-room/'+id;
        };

        window.filterMocks = function(f) { 
            currentFilter = f; 
            selectedSeries = null;
            render(); 
        };

        window.viewSeriesMocks = function(id) {
            selectedSeries = allSeries.find(function(s) { return s.id === id; });
            render();
            container.scrollIntoView({ behavior: 'smooth' });
        };

        window.openSeriesSchedule = function(id) {
            var s = allSeries.find(function(x) { return x.id === id; });
            if (!s || !s.schedule_info) return;

            var modal = document.createElement('div');
            modal.id = 'series-schedule-modal';
            modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300';
            modal.innerHTML = '<div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all scale-95 opacity-0" id="series-modal-content">' +
                '<div class="p-8 border-b border-slate-50 flex items-center justify-between">' +
                    '<div class="flex items-center gap-4">' +
                        '<div class="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>' +
                        '<div><h2 class="text-xl font-black text-slate-900 uppercase tracking-tight">Series Schedule</h2><p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">'+s.title+'</p></div>' +
                    '</div>' +
                    '<button onclick="closeSeriesSchedule()" class="p-2 hover:bg-slate-50 rounded-xl transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
                '</div>' +
                '<div class="p-10 max-h-[60vh] overflow-y-auto text-slate-600 leading-relaxed text-sm">' + s.schedule_info + '</div>' +
                '<div class="p-8 bg-slate-50 flex justify-end"><button onclick="closeSeriesSchedule()" class="bg-slate-900 text-white rounded-2xl px-8 py-3 text-[10px] font-black uppercase tracking-widest">Close Schedule</button></div>' +
            '</div>';
            
            document.body.appendChild(modal);
            setTimeout(function() {
                var content = document.getElementById('series-modal-content');
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }, 10);

            window.closeSeriesSchedule = function() {
                var content = document.getElementById('series-modal-content');
                content.classList.remove('scale-100', 'opacity-100');
                content.classList.add('scale-95', 'opacity-0');
                setTimeout(function() { modal.remove(); }, 300);
            };
        };

        async function fetchData() {
            try {
                var resSessions = await sb.from('mock_sessions').select('*').eq('is_active', true).eq('exam_type', examType).order('start_time', { ascending: false });
                var resSeries = await sb.from('mock_series').select('*, mock_series_items(session_id)').eq('is_active', true).eq('exam_type', examType).order('created_at', { ascending: false });
                
                sessions = resSessions.data || [];
                allSeries = resSeries.data || [];
                
                var now = new Date();
                sessions.forEach(function(s) {
                    var st = new Date(s.start_time), et = new Date(s.end_time);
                    s.statusFlag = st > now ? 'upcoming' : (et < now ? 'past' : 'live');
                });

                render();
            } catch (err) { 
                console.error('Mock Fetch Error:', err); 
                container.innerHTML = '<div class="text-center py-20 text-red-500 font-bold uppercase tracking-widest text-[9px]">Connection Failed</div>'; 
            }
        }

        function render() {
            var html = '';
            
            if (currentFilter === 'series' && !selectedSeries) {
                if (allSeries.length === 0) {
                    container.innerHTML = '<div class="py-32 text-center opacity-30"><h3 class="text-2xl font-black uppercase tracking-tighter">No Series Established</h3></div>';
                    return;
                }
                html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">';
                allSeries.forEach(function(s) {
                    html += '<div class="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 border-b-[6px] shadow-sm hover:border-indigo-200 transition-all cursor-pointer group flex flex-col justify-between" onclick="viewSeriesMocks(\''+s.id+'\')">' +
                        '<div>' +
                            '<div class="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6 text-indigo-600 group-hover:scale-110 transition-transform"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2h2v20h-2z"/><path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6"/><path d="M12 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/></svg></div>' +
                            '<h3 class="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">'+s.title+'</h3>' +
                            '<p class="text-xs text-slate-500 font-medium line-clamp-2 mb-6">'+(s.description || 'Curated series of practice mocks.')+'</p>' +
                            '<div class="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-400">' +
                                '<span class="flex items-center gap-1.5">⚡ '+(s.mock_series_items ? s.mock_series_items.length : 0)+' Mocks</span>' +
                                '<span class="flex items-center gap-1.5">📅 Updated '+new Date(s.created_at).toLocaleDateString()+'</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="pt-8 flex flex-col gap-2">' +
                            '<button class="w-full bg-indigo-600 text-white h-12 rounded-2xl text-[10px] uppercase font-black tracking-widest shadow-lg shadow-indigo-100">View Mocks</button>' +
                            (s.schedule_info ? '<button onclick="event.stopPropagation(); window.openSeriesSchedule(\''+s.id+'\')" class="w-full h-10 rounded-xl text-[9px] uppercase font-bold tracking-widest text-slate-400 hover:text-slate-600">Open Schedule</button>' : '') +
                        '</div>' +
                    '</div>';
                });
                html += '</div>';
                container.innerHTML = html;
                return;
            }

            var filtered = sessions;
            if (selectedSeries) {
                var ids = selectedSeries.mock_series_items.map(function(item) { return item.session_id; });
                filtered = sessions.filter(function(s) { return ids.indexOf(s.id) !== -1; });
                
                html += '<div class="flex flex-col md:flex-row items-center justify-between gap-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 mb-8">' +
                    '<div class="flex items-center gap-4">' +
                        '<button onclick="window.filterMocks(\'series\')" class="w-10 h-10 rounded-full hover:bg-white flex items-center justify-center transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>' +
                        '<div><h2 class="text-lg font-black text-slate-900 uppercase tracking-tight">'+selectedSeries.title+'</h2><p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Showing mocks in this series</p></div>' +
                    '</div>' +
                    (selectedSeries.schedule_info ? '<button onclick="window.openSeriesSchedule(\''+selectedSeries.id+'\')" class="bg-indigo-600 text-white px-6 h-10 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md shadow-indigo-100">Series Schedule</button>' : '') +
                '</div>';
            } else {
                if (currentFilter === 'upcoming') filtered = sessions.filter(function(s) { return s.statusFlag !== 'past'; });
                else if (currentFilter === 'past') filtered = sessions.filter(function(s) { return s.statusFlag === 'past'; });
            }

            if (filtered.length === 0) {
                container.innerHTML = html + '<div class="py-32 text-center opacity-30"><h3 class="text-2xl font-black uppercase tracking-tighter">No Simulations Found</h3></div>';
                return;
            }

            var upcoming = filtered.filter(function(s) { return s.statusFlag !== 'past'; });
            var archive = filtered.filter(function(s) { return s.statusFlag === 'past'; });

            if (upcoming.length > 0) {
                html += '<div class="mb-24"><h3 class="text-2xl font-black text-[#001533] uppercase tracking-tight mb-10">Mocks Available</h3><div class="grid gap-6">';
                upcoming.forEach(function(s) {
                    var d = new Date(s.start_time);
                    html += '<div class="bg-white rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between border border-slate-100 group shadow-sm"><div class="flex items-center gap-8"><div class="flex flex-col items-center justify-center bg-slate-50 rounded-2xl w-20 h-20"><span class="text-2xl font-black">'+d.getDate()+'</span><span class="text-[8px] font-bold uppercase text-slate-400">'+d.toLocaleString('default',{month:'short'})+'</span></div><div><h3 class="text-xl font-black text-slate-900 mb-1">'+s.title+'</h3><span class="text-[9px] font-black uppercase '+(s.statusFlag==='live'?'text-red-600 bg-red-50':'text-emerald-600 bg-emerald-50')+' px-3 py-1 rounded-full">'+(s.statusFlag==='live'?'Live Now':'Registration Open')+'</span></div></div><button onclick="handleStartSimulation(\''+s.id+'\', false)" class="mt-6 md:mt-0 px-8 py-3 bg-[#001533] text-white rounded-xl font-bold uppercase text-[10px] tracking-widest">Register Now</button></div>';
                });
                html += '</div></div>';
            }

            if (archive.length > 0) {
                html += '<div><h3 class="text-2xl font-black text-[#001533] uppercase tracking-tight mb-10">Historical Archive</h3><div class="grid gap-4 bg-white border border-slate-100 rounded-[2rem] p-4 shadow-sm">';
                archive.forEach(function(s) {
                    var d = new Date(s.start_time).toLocaleDateString('en-US',{day:'2-digit',month:'short',year:'numeric'});
                    html += '<div onclick="handleStartSimulation(\''+s.id+'\', true)" class="flex items-center justify-between p-6 hover:bg-slate-50 rounded-2xl cursor-pointer group transition-all"><div class="flex items-center gap-4"><div class="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-xl text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><span class="font-bold text-slate-900">'+s.title+'</span></div><span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">'+d+'</span></div>';
                });
                html += '</div></div>';
            }
            container.innerHTML = html;
        }

        fetchData();
    }
})();
