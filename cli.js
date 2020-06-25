#!/usr/bin/env node

const ordbok = require('./index');
const pkg = require('./package.json');
//const query = process.argv[2]

/* function printHelp () {
  console.log(pkg.description)
  console.log('')
  console.log('Usage:')
  console.log('  $ ordbok <query>')
}

if (!query || process.argv.indexOf('-h') !== -1 || process.argv.indexOf('--help') !== -1) {
  printHelp()
  process.exit(0)
}

if (process.argv.indexOf('-v') !== -1 || process.argv.indexOf('--version') !== -1) {
  console.log(pkg.version)
  process.exit(0)
} */

ordbok({ word: 'løsninger' }, function (err, data) {
  if (err) {
    throw err;
  }
  console.log(JSON.stringify(data));
});
