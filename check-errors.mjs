#!/usr/bin/env node
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

try {
  console.log('Running typecheck...');
  const typecheckOutput = execSync('npm run typecheck 2>&1', { encoding: 'utf-8' });
  writeFileSync('typecheck-output.txt', typecheckOutput);
  console.log('Typecheck completed');
} catch (error) {
  writeFileSync('typecheck-output.txt', error.stdout?.toString() || error.message);
  console.log('Typecheck had errors');
}

try {
  console.log('Running lint...');
  const lintOutput = execSync('npm run lint 2>&1', { encoding: 'utf-8' });
  writeFileSync('lint-output.txt', lintOutput);
  console.log('Lint completed');
} catch (error) {
  writeFileSync('lint-output.txt', error.stdout?.toString() || error.message);
  console.log('Lint had errors');
}
