const fs = require('fs');
const content = fs.readFileSync('d:\\italostudy\\italostudy-app\\src\\components\\PricingModal.tsx', 'utf8');

const mStartStr1 = '<motion.div\r\n                            key="pricing-modal-mobile"';
const mStartStr2 = '<motion.div\n                            key="pricing-modal-mobile"';

let startIdx = content.indexOf(mStartStr1);
if (startIdx === -1) startIdx = content.indexOf(mStartStr2);

const endStr = '                        </motion.div>';
let endIdx = content.indexOf(endStr, startIdx);

// Wait, the mobile div might contain nested </motion.div>.
// Let's use simple bracket counting to be robust, or since we know it's the exact block we wrote...
// It's just the old modal body. Actually, it contains ONE nested motion.div (for FAQItem), wait no, FAQItem is outside.
// The easiest is just finding the next <motion.div key="pricing-modal-desktop">
const desktopStartStr = '<motion.div\r\n                            key="pricing-modal-desktop"';
let desktopStartIdx = content.indexOf(desktopStartStr);
if (desktopStartIdx === -1) desktopStartIdx = content.indexOf('<motion.div\n                            key="pricing-modal-desktop"');

const mobileCode = content.substring(startIdx, desktopStartIdx);
fs.writeFileSync('d:\\italostudy\\italostudy-app\\mobile_temp.txt', mobileCode, 'utf8');
console.log('Mobile code extracted: ' + mobileCode.length + ' chars');
