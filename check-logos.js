import fs from 'fs';

function check(file) {
    const buf = fs.readFileSync(file);
    const width = buf.readInt32BE(16);
    const height = buf.readInt32BE(20);
    console.log(`${file}: ${width}x${height}`);
}

check('public/italostudy-logo.png');
check('public/logo-dark-compact.png');
check('public/sidebar-logo.png');
check('public/logo.png');
