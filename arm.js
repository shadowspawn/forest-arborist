#!/usr/local/bin/node

var program = require('commander');
const chalk = require('chalk');

// Command line processing

program
   .version('0.0.1');

// Extra help
program.on('--help', function(){
   console.log("  See also 'arm <command> --help' to read about a specific subcommand.");
   console.log('');
   });

program
   .command('install')
   .description('install dependent repositories')
   .option('-n, --dry-run', 'do not perform actions, just print output')
   .action(function(){
      console.log(chalk.red('not implemented yet'));
      process.exit(0);
      });

program
   .command('init')
   .description('add placeholder file at root of source tree')
   .action(function(){
      console.log(chalk.red('not implemented yet'));
      process.exit(0);
      });

program.parse(process.argv);

// Calling exit as part of recognised command handling,
// so into error handling if reach this code.

// Show help if no command specified.
if (process.argv.length == 2)
   {
   program.outputHelp();
   process.exit(1);
   }

// Error in the same style as command uses for unknown option
console.log('');
console.log("  error: unknown command `" + process.argv[2] + "'");
console.log('');
process.exit(1);
