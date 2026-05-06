import fs from 'node:fs';
import path from 'node:path';
import pug from 'pug';

const cwd = process.cwd();
const inputPath = path.join(cwd, 'index.pug');
const outputPath = path.join(cwd, 'index.html');

const html = pug.renderFile(inputPath, { pretty: true, basedir: cwd });
fs.writeFileSync(outputPath, html, 'utf8');
console.log(`rendered ${outputPath}`);
