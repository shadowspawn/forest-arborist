#!/usr/local/bin/node

var program = require('commander');
const chalk = require('chalk');

// Command line processing

recognisedCommand = false;

program
   .version('0.0.1');

program
   .command('install')
   .description('install dependent repositories')
   .action(function(){
     recognisedCommand = true;
     console.log('code-code-here');
   });

program.parse(process.argv);
if (!recognisedCommand || !process.argv.slice(2).length)
   {
   console.log(chalk.yellow('No command specified'));
   program.outputHelp();
   process.exit(1);
   }
