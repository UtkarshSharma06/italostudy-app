const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/vendor-mOCKdFY1.js","assets/vendor-wklAmtGL.css"])))=>i.map(i=>d[i]);
import{r as l,j as o,bn as c}from"./vendor-mOCKdFY1.js";import{c as y}from"./main-DFfpDvQ9.js";const w=l.memo(({content:m,className:f,isHtml:d=!1,variant:u="premium",...p})=>{const a=l.useRef(null);return l.useEffect(()=>{const h=async()=>{if(a.current)try{const s=(await c(async()=>{const{default:e}=await import("./vendor-mOCKdFY1.js").then(r=>r.gD);return{default:e}},__vite__mapDeps([0,1]))).default,t=Array.from(a.current.querySelectorAll("table")),n=[];t.forEach(e=>{const r=document.createComment("table-placeholder");e.parentNode?.insertBefore(r,e),e.parentNode?.removeChild(e),n.push({placeholder:r,table:e})}),s(a.current,{delimiters:[{left:"\\[",right:"\\]",display:!0},{left:"\\(",right:"\\)",display:!1},{left:"$$",right:"$$",display:!0},{left:"$",right:"$",display:!1}],throwOnError:!1,errorColor:"#cc0000",trust:!0,strict:!1,fleqn:!1}),n.forEach(({placeholder:e,table:r})=>{e.parentNode?.insertBefore(r,e),e.parentNode?.removeChild(e),setTimeout(async()=>{r&&s(r,{delimiters:[{left:"\\[",right:"\\]",display:!0},{left:"\\(",right:"\\)",display:!1},{left:"$$",right:"$$",display:!0},{left:"$",right:"$",display:!1}],throwOnError:!1,errorColor:"#cc0000",trust:!0,strict:!1,fleqn:!1})},0)})}catch{}};(async()=>{if(a.current){const s=(await c(async()=>{const{default:i}=await import("./vendor-mOCKdFY1.js").then(x=>x.gC);return{default:i}},__vite__mapDeps([0,1]))).default;let t=m||"";const e=["\\frac","\\sqrt","\\text{","\\alpha","\\beta","\\gamma","\\sum","\\int","\\pm","\\times","\\div"].some(i=>t.includes(i)),r=["$","\\(","\\["].some(i=>t.includes(i));if(e&&!r&&t.trim().startsWith("\\")&&(t=`\\[ ${t} \\]`),t=t.replace(new RegExp("(?<!\\\\)%","g"),"\\%"),d)a.current.innerHTML=s.sanitize(t);else{const i=t.replace(/\n/g,"<br/>");a.current.innerHTML=s.sanitize(i)}h()}})()},[m,d]),o.jsxs(o.Fragment,{children:[o.jsx("style",{dangerouslySetInnerHTML:{__html:`
                .katex-premium .katex { 
                    color: #4f46e5 !important; 
                    font-weight: 700 !important; 
                }
                .dark .katex-premium .katex { 
                    color: #818cf8 !important; 
                }
                .katex-premium .katex-display {
                    margin: 1.5em 0 !important;
                    overflow-x: auto !important;
                    overflow-y: hidden !important;
                    padding: 1rem 0 !important;
                    max-width: 100% !important;
                    scrollbar-width: thin;
                }
                .katex-premium .katex-display::-webkit-scrollbar {
                    height: 4px;
                }
                .katex-premium .katex-display::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .dark .katex-premium .katex-display::-webkit-scrollbar-thumb {
                    background: #334155;
                }
                /* Handle inline math overflow if necessary, although rare */
                .katex-premium .katex-html {
                    max-width: 100%;
                    overflow-x: auto;
                    overflow-y: hidden;
                    vertical-align: middle;
                }
            `}}),o.jsx("div",{ref:a,className:y(f,u==="premium"&&"katex-premium"),...p})]})});export{w as M};
