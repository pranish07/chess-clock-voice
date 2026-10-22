import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

if (!existsSync(join(dist, 'manifest.json'))) {
  console.error('dist/manifest.json is missing. Run npm run build first.');
  process.exit(1);
}

const releaseDir = join(root, 'release');
mkdirSync(releaseDir, { recursive: true });
const output = join(releaseDir, `chess-clock-voice-${pkg.version}.zip`);

const outputStream = createWriteStream(output);
const archive = archiver('zip', { zlib: { level: 9 } });

await new Promise((resolve, reject) => {
  outputStream.on('close', resolve);
  outputStream.on('error', reject);
  archive.on('warning', (error) => {
    if (error.code === 'ENOENT') console.warn(error);
    else reject(error);
  });
  archive.on('error', reject);
  archive.pipe(outputStream);
  archive.glob('**/*', {
    cwd: dist,
    dot: true,
    ignore: ['**/*.map'],
  });
  archive.finalize();
});

console.log(`Packaged ${output}`);
