const fs = require('fs');

const targetPath = 'd:\\italostudy\\italostudy-app\\src\\components\\PricingModal.tsx';
let content = fs.readFileSync(targetPath, 'utf8');

// Find `)}` followed by `</AnimatePresence>`
const target = '                )}\r\n            </AnimatePresence>';
let idx = content.indexOf(target);
if (idx === -1) {
    idx = content.indexOf('                )}\n            </AnimatePresence>');
}

if (idx !== -1) {
    const fixed = content.substring(0, idx) + '                    </motion.div>\n' + content.substring(idx);
    fs.writeFileSync(targetPath, fixed, 'utf8');
    console.log('Fixed missing closing tag!');
} else {
    console.log('Target not found.');
}
