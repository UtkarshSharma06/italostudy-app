import{bw as P,bZ as q,r as c,j as s,bB as B}from"./vendor-mOCKdFY1.js";import{d as H,s as x,c as W}from"./main-DFfpDvQ9.js";import"./chunk-supabase-B91zn8CY.js";import"./chunk-motion-BUF95O7K.js";function L(r){const n=r.trim();if(!/<html/i.test(n))return n;const f=[],d=/<style[^>]*>([\s\S]*?)<\/style>/gi;let i;for(;(i=d.exec(n))!==null;)f.push(`<style>${i[1]}</style>`);const o=n.match(/<body[^>]*>([\s\S]*?)<\/body>/i),g=o?o[1]:n;return f.join(`
`)+`
`+g}function R(r){r.querySelectorAll("script").forEach(n=>{if(n.dataset.activated)return;n.dataset.activated="true";const d=n.closest('[id^="ann-"]')?.id||r.id||`banner-${Math.random().toString(36).substr(2,9)}`,i=document.createElement("script");Array.from(n.attributes).forEach(o=>i.setAttribute(o.name,o.value)),i.textContent=`
            (function(window, globalThis, self, setInterval, setTimeout, requestAnimationFrame) {
                const __annId = "${d}";
                const __originalSetInterval = window.setInterval;
                const __originalSetTimeout = window.setTimeout;
                const __originalRAF = window.requestAnimationFrame;

                const isAlive = () => !!document.getElementById(__annId);

                // Proxy setInterval
                const _setInterval = (fn, delay, ...args) => {
                    const id = __originalSetInterval(() => {
                        if (!isAlive()) {
                            clearInterval(id);
                            return;
                        }
                        try {
                            if (typeof fn === 'function') fn(...args);
                            else eval(fn);
                        } catch (e) {
                            if (e.message.includes('null') || e.message.includes('innerText') || e.message.includes('innerHTML')) {
                                clearInterval(id);
                                console.debug("Banner script auto-stopped (DOM null):", e.message);
                            }
                        }
                    }, delay);
                    return id;
                };

                // Proxy setTimeout
                const _setTimeout = (fn, delay, ...args) => {
                    return __originalSetTimeout(() => {
                        if (!isAlive()) return;
                        try {
                            if (typeof fn === 'function') fn(...args);
                            else eval(fn);
                        } catch (e) {
                            console.debug("Banner timeout suppressed error:", e.message);
                        }
                    }, delay);
                };

                // Proxy requestAnimationFrame
                const _requestAnimationFrame = (fn) => {
                    return __originalRAF((timestamp) => {
                        if (!isAlive()) return;
                        try {
                            fn(timestamp);
                        } catch (e) {
                            console.debug("Banner RAF suppressed error:", e.message);
                        }
                    });
                };

                // Create a proxy for window/globalThis to intercept calls to setInterval/setTimeout
                const proxyHandler = {
                    get(target, prop) {
                        if (prop === 'setInterval') return _setInterval;
                        if (prop === 'setTimeout') return _setTimeout;
                        if (prop === 'requestAnimationFrame') return _requestAnimationFrame;
                        const val = target[prop];
                        return typeof val === 'function' ? val.bind(target) : val;
                    }
                };
                const proxy = new Proxy(targetWindow, proxyHandler);

                try {
                    if (!isAlive()) return;
                    ${n.textContent}
                } catch (e) {
                    console.debug("Banner initial execution error:", e.message);
                }
            })(window, globalThis, self, undefined, undefined, undefined); 
        `.replace("undefined, undefined, undefined","_setInterval, _setTimeout, _requestAnimationFrame").replace("targetWindow","window"),i.textContent=`
            (function() {
                const __annId = "${d}";
                const isAlive = () => !!document.getElementById(__annId);

                const setInterval = (fn, delay, ...args) => {
                    const id = window.setInterval(() => {
                        if (!isAlive()) { clearInterval(id); return; }
                        try { if (typeof fn === 'function') fn(...args); else eval(fn); }
                        catch (e) { 
                            if (e.message.includes('null') || e.message.includes('innerText')) {
                                clearInterval(id);
                                console.debug("Banner script auto-stopped:", e.message);
                            }
                        }
                    }, delay);
                    return id;
                };

                const setTimeout = (fn, delay, ...args) => {
                    return window.setTimeout(() => {
                        if (!isAlive()) return;
                        try { if (typeof fn === 'function') fn(...args); else eval(fn); }
                        catch (e) { console.debug("Banner timeout suppressed:", e.message); }
                    }, delay);
                };

                try {
                    if (!isAlive()) return;
                    ${n.textContent}
                } catch (e) {
                    console.debug("Banner execution error:", e.message);
                }
            })();
        `,n.parentNode?.replaceChild(i,n)})}function Z({previewData:r}){const n=P(),f=q(),{activeExam:d}=H(),[i,o]=c.useState([]),[g,C]=c.useState([]),[E,_]=c.useState(!r),[S,N]=c.useState(!1);c.useEffect(()=>{const e=()=>N(window.innerWidth<768);return e(),window.addEventListener("resize",e),()=>window.removeEventListener("resize",e)},[]),c.useEffect(()=>{if(r){o([r]),_(!1);return}w();const e=x.channel("public:site_announcements").on("postgres_changes",{event:"*",schema:"public",table:"site_announcements"},()=>{w()}).subscribe();return()=>{x.removeChannel(e)}},[n.pathname,r,d?.id]);const w=async()=>{try{const e=n.pathname;if(!r&&(e.includes("/test/")||e.includes("/sectioned-test/")||e.startsWith("/admin"))){o([]);return}const a=e.startsWith("/store")||e.startsWith("/mobile/store"),u=e==="/"||e.includes("/dashboard")||e.startsWith("/mobile/dashboard"),{data:t,error:y}=await x.from("site_announcements").select("*").eq("is_active",!0).order("created_at",{ascending:!1});if(y)throw y;if(t&&t.length>0){const h=t.filter(m=>{const l=m.page_target;if(l==="global"||l==="dashboard"&&u||l==="store"&&a||u&&d?.id===l)return!0;const $=e==="/",z=e==="/pricing",M=e==="/blog"||e.startsWith("/blog/");return!!(l==="public_popup"||l==="public_popup_home"&&$||l==="public_popup_store"&&a||l==="public_popup_pricing"&&z||l==="public_popup_blog"&&M)}).filter(m=>!g.includes(m.id));o(h)}else o([])}catch{}finally{_(!1)}},I=e=>{p.current&&(p.current.innerHTML="");const a=[...g,e];C(a),o(u=>u.filter(t=>t.id!==e))},[F,A]=c.useState(!1);c.useEffect(()=>{if(i.some(e=>e.page_target.startsWith("public_popup"))){const e=setTimeout(()=>A(!0),3e3);return()=>clearTimeout(e)}else A(!1)},[i]);const p=c.useRef(null),T=c.useRef(new Set),b=i.filter(e=>!e.page_target.startsWith("public_popup")),v=i.filter(e=>e.page_target.startsWith("public_popup"));c.useEffect(()=>{if(!p.current)return;const e=b.map(a=>a.id).join(",");T.current.has(e)||(T.current.add(e),R(p.current))});const k=e=>{const u=e.target.closest("a");if(!u)return;const t=u.getAttribute("href");if(!t)return;if(["/blog","/resources","/it","/tr","/exams","/store"].some(h=>t.startsWith(h))||t==="/"){e.preventDefault();const h=t.startsWith("/store")?"https://store.italostudy.com":"https://italostudy.com",m=t.startsWith("/store")?t.replace(/^\/store/,""):t,l=`${h}${m==="/"?"":m}`;window.open(l,"_blank","noopener,noreferrer");return}const j=["/status","/roadmap","/updates","/cent-s-mock","/imat-mock"];t.endsWith(".html")||j.includes(t)||t.startsWith("/")&&(e.preventDefault(),f(t))};return E||b.length===0&&v.length===0?null:s.jsxs(s.Fragment,{children:[b.length>0&&s.jsx("div",{ref:p,onClick:k,style:{width:"100%",overflow:"hidden"},children:b.map(e=>{const a=S&&e.mobile_content?e.mobile_content:e.content,u=L(a),t=`ann-${e.id}`;return s.jsxs("div",{id:t,className:"relative group w-full",style:{overflow:"hidden"},"data-ann-id":e.id,children:[s.jsx("div",{style:{width:"100%",overflow:"hidden"},dangerouslySetInnerHTML:{__html:`<style>.ann-root{width:100%;overflow:hidden;box-sizing:border-box;}.ann-root>*{width:100%!important;max-width:100%!important;box-sizing:border-box!important;min-width:0!important;}</style><div class="ann-root">${u}</div>`}}),!r&&s.jsx("button",{onClick:()=>I(e.id),"aria-label":"Dismiss announcement",className:"absolute top-1/2 -translate-y-1/2 right-2 md:right-3 z-50 flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all duration-200 opacity-60 hover:opacity-100 group-hover:opacity-100",children:s.jsx(B,{size:12,className:"text-white",strokeWidth:3})})]},e.id)})}),v.length>0&&F&&s.jsxs("div",{className:W("z-[200] flex items-center justify-center p-4",r?"relative w-full min-h-[300px]":"fixed inset-0 pointer-events-none"),children:[s.jsx("div",{className:W("absolute inset-0 bg-black/40 backdrop-blur-sm",r?"rounded-2xl":"pointer-events-auto")}),s.jsx("div",{className:"flex flex-col gap-4 pointer-events-none relative z-[210] max-w-[95vw] w-fit mx-auto",children:v.map(e=>{const a=`ann-${e.id}`;return s.jsxs("div",{id:a,className:"relative pointer-events-auto animate-fadeIn group w-fit mx-auto",onClick:k,"data-ann-id":e.id,children:[s.jsx("div",{className:"shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[32px] overflow-hidden border border-white/10 w-fit",dangerouslySetInnerHTML:{__html:e.content}}),s.jsx("button",{onClick:()=>I(e.id),className:"absolute -top-3 -right-3 p-2 bg-white dark:bg-slate-800 rounded-full shadow-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all z-[220] opacity-100 md:opacity-0 md:group-hover:opacity-100",children:s.jsx(B,{size:16,className:"text-slate-500"})})]},e.id)})})]})]})}export{Z as default};
