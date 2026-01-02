#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dataPath = resolve('docs/flutter-migration/phase7-traceability.json');
const outputPath = resolve('docs/flutter-migration/phase7-traceability.csv');

const rows = JSON.parse(readFileSync(dataPath, 'utf8'));
const headers = ['rn_screens', 'flutter_route', 'owner', 'tests', 'qa_checklist'];
const csv = [headers.join(',')]
  .concat(
    rows.map((row) =>
      [row.rn, row.flutter, row.owner, row.tests, row.qa]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',')
    )
  )
  .join('\n');

writeFileSync(outputPath, `${csv}\n`, 'utf8');
console.log(`Wrote ${rows.length} rows to ${outputPath}`);
