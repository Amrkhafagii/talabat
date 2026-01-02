#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const bannedEntries = [
  'app',
  'components',
  'hooks',
  'styles',
  'contexts',
  'assets',
  'app.json',
  'expo-env.d.ts',
  'metro.config.js',
  'babel.config.js'
];

const bannedDependencies = [
  'expo',
  'expo-router',
  'expo-splash-screen',
  'expo-status-bar',
  '@expo/vector-icons',
  '@expo-google-fonts/inter',
  'react',
  'react-dom',
  'react-native',
  'react-native-web'
];

const skipPrefixes = [
  'node_modules',
  '.git',
  '.idea',
  '.fleet',
  'flutter/.dart_tool',
  'flutter/build',
  'flutter/.fvm'
];

const bannedExtensions = new Set(['.tsx', '.jsx']);
const violations = [];

for (const entry of bannedEntries) {
  if (existsSync(path.join(repoRoot, entry))) {
    violations.push(`Remove legacy React Native entry: ${entry}`);
  }
}

const pkgPath = path.join(repoRoot, 'package.json');
try {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const sections = ['dependencies', 'devDependencies', 'peerDependencies'];
  for (const section of sections) {
    const deps = pkg[section];
    if (!deps) continue;
    for (const bad of bannedDependencies) {
      if (Object.hasOwn(deps, bad)) {
        violations.push(`Remove ${bad} from ${section} in package.json`);
      }
    }
  }
} catch (err) {
  violations.push(`Failed to parse package.json: ${err.message}`);
}

function shouldSkipDirectory(relPath) {
  return skipPrefixes.some((prefix) => relPath === prefix || relPath.startsWith(`${prefix}/`));
}

function walk(currentDir) {
  const entries = readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.relative(repoRoot, fullPath);
    if (relPath.length === 0) continue;

    if (entry.isDirectory()) {
      if (shouldSkipDirectory(relPath)) {
        continue;
      }
      walk(fullPath);
      continue;
    }

    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (bannedExtensions.has(ext)) {
      violations.push(`Remove ${relPath} (React Native extension ${ext})`);
    }
  }
}

walk(repoRoot);

if (violations.length > 0) {
  console.error('React Native cleanup guard failed:');
  for (const message of violations) {
    console.error(` - ${message}`);
  }
  process.exit(1);
}

console.log('React Native guard passed – Flutter-only tree confirmed.');
