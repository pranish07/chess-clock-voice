import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packagePath = join(root, 'package.json');
const manifestPath = join(root, 'manifest.json');
const lockPath = join(root, 'package-lock.json');

const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const arg = process.argv[2] ?? 'patch';

function bump(version, type) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Unsupported current version: ${version}`);
  let [major, minor, patch] = match.slice(1).map(Number);
  if (type === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === 'minor') {
    minor += 1;
    patch = 0;
  } else if (type === 'patch') {
    patch += 1;
  } else {
    if (!/^\d+\.\d+\.\d+$/.test(type)) {
      throw new Error('Usage: npm run bump -- patch|minor|major|x.y.z');
    }
    return type;
  }
  return `${major}.${minor}.${patch}`;
}

const next = bump(pkg.version, arg);
pkg.version = next;
manifest.version = next;
writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

if (existsSync(lockPath)) {
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  lock.version = next;
  if (lock.packages?.['']) lock.packages[''].version = next;
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
}

console.log(`Version bumped to ${next} in package.json, manifest.json, and lockfile.`);
