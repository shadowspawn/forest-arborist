#!/usr/bin/env node
// Node location may vary between Mac and Lin, so env for portability.

'use strict'; // eslint-disable-line strict

// Naming used in this file: the repo/directory containing the config file is the nest.
// (Following theme of root and forest...)

const program = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const childProcess = require('child_process');
const path = require('path');
const url = require('url');
const mute = require('mute');
const shellQuote = require('shell-quote');
const myPackage = require('./package.json');

const armManifest = 'arm.json'; // stored in nest directory
const armRootFilename = '.arm-root.json'; // stored in root directory

let gRecognisedCommand = false; // Seems there should be a tidier way...

const my = {
  errorColour: (text) => chalk.red(text),
  commandColour: (text) => chalk.blue(text),
};


function terminate(message) {
  console.log(my.errorColour(`Error: ${message}`));
  process.exit(1);
}


function fileExistsSync(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}


function dirExistsSync(filePath) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}


function getUnrecognisedArgs() {
  const args = program.args[0];

  // commander is passing "self" as final parameter for undocumented reasons!
  if ((args.length > 0) && (typeof args[args.length - 1] === 'object')) {
    args.pop();
  }

  return args;
}


function assertNoArgs() {
  // commander does not complain if arguments are supplied for commands
  // which do not have any. Do some checking ourselves.
  const unrecognisedArgs = getUnrecognisedArgs();
  if (unrecognisedArgs.length > 0) {
    console.log('');
    console.log(`  error: unexpected extra args: ${unrecognisedArgs}`);
    console.log('');
    process.exit(1);
  }
}


function execCommandSync(commandParam) {
  const command = commandParam;
  if (command.args === undefined) command.args = [];
  let cwdDisplay = `${command.cwd}: `;
  if (command.cwd === undefined || command.cwd === '') {
    cwdDisplay = '(root): ';
    command.cwd = '.';
  }
  if (command.suppressContext) cwdDisplay = '';

  // Trying hard to get a possibly copy-and-paste command.
  // let quotedArgs = '';
  // if (command.args.length > 0) quotedArgs = `'${command.args.join("' '")}'`;
  // quotedArgs = quotedArgs.replace(/\n/g, '\\n');
  const quotedArgs = shellQuote.quote(command.args);
  console.log(chalk.blue(`${cwdDisplay}${command.cmd} ${quotedArgs}`));

  try {
    // Note: the stdio option hooks up child stream to parent so we get live progress.
    childProcess.execFileSync(
        command.cmd, command.args,
        { cwd: command.cwd, stdio: [0, 1, 2] }
      );
  } catch (err) {
    // Some commands return non-zero for expected situations
    if (command.allowedShellStatus === undefined || command.allowedShellStatus !== err.status) {
      throw err;
    }
  }
  console.log(''); // blank line after command output
}


function isRelativePath(pathname) {
  if (pathname === null || pathname === undefined) { return false; }

  return pathname.startsWith('./') || pathname.startsWith('../');
}


function isGitRepository(repository) {
  const unmute = mute();
  try {
    // KISS and get git to check. Hard to be definitive by hand, especially with scp URLs.
    childProcess.execFileSync(
      'git', ['ls-remote', repository]
    );
    unmute();
    return true;
  } catch (err) {
    unmute();
    return false;
  }
}


function isHgRepository(repository) {
  const unmute = mute();
  try {
    // KISS and get hg to check. Hard to be definitive by hand, especially with scp URLs.
    childProcess.execFileSync(
      'hg', ['id', repository]
    );
    unmute();
    return true;
  } catch (err) {
    unmute();
    return false;
  }
}


function resolveOrigin(parsedOrigin, relativePath) {
  // Do the fake protocols first
  if (parsedOrigin.protocol === 'local') {
    const temp = path.posix.resolve(parsedOrigin.pathname, relativePath);
    return path.posix.normalize(temp);
  } else if (parsedOrigin.protocol === 'scp') {
    const temp = path.join(parsedOrigin.pathname, relativePath);
    const absolutePathname = path.posix.normalize(temp);
    return `${parsedOrigin.authAndHost}:${absolutePathname}`;
  }

  // Proper protocol! Tweak path and reconstruct full URL.
  const parsedTemp = url.parse(parsedOrigin.href);
  const temp2 = path.join(parsedOrigin.pathname, relativePath);
  parsedTemp.pathname = path.posix.normalize(temp2);
  return url.format(parsedTemp);
}


function sameParsedOriginDir(origin1, origin2) {
  if (origin1.protocol !== origin2.protocol) return false;

  // Do the fake protocols first
  if (origin1.protocol === 'local') {
    return (path.posix.dirname(origin1.pathname) === path.posix.dirname(origin2.pathname));
  } else if (origin1.protocol === 'scp') {
    return (origin1.authAndHost === origin2.authAndHost)
      && (path.posix.dirname(origin1.pathname) === path.posix.dirname(origin2.pathname));
  }

  // Proper protocol! Tweak path and reconstruct full URL for dir.
  const dir1 = url.parse(origin1.href);
  dir1.pathname = path.posix.dirname(dir1.pathname);
  const dir2 = url.parse(origin2.href);
  dir2.pathname = path.posix.dirname(dir2.pathname);
  return url.format(dir1) === url.format(dir2);
}


function parseRepository(repository) {
  // See GIT URLS on https://git-scm.com/docs/git-clone
  // See "hg help urls"
  // Parsing for git covers hg as well, sweet!
  const result = {};
  const parsed = url.parse(repository);
  const recognisedProtocols = ['ssh:', 'git:', 'http:', 'https:', 'ftp:', 'ftps:', 'file:'];
  if (recognisedProtocols.indexOf(parsed.protocol) > -1) {
    result.protocol = parsed.protocol;
    result.pathname = parsed.pathname;
    result.href = parsed.href;
  } else {
    // git variation.
    //   An alternative scp-like syntax may also be used with the ssh protocol:
    //     [user@]host.xz:path/to/repo.git/
    //   This syntax is only recognized if there are no slashes before the first colon.
    const slashPos = repository.indexOf('/');
    const colonPos = repository.indexOf(':');
    if (colonPos > 0 && ((slashPos === -1) || (slashPos > colonPos))) {
      result.protocol = 'scp';
      result.pathname = repository.substring(colonPos + 1);
      result.authAndHost = repository.substring(0, colonPos);
    } else {
      // 1. Not supporting hg #revision here yet, add if needed.
      // 2. Do we need to support windows local paths?
      result.protocol = 'local';
      result.pathname = repository;
    }
  }

  return result;
}


function readNestPathFromRoot() {
  const armRootPath = path.resolve(armRootFilename);
  const data = fs.readFileSync(armRootPath);
  let rootObject;
  try {
    rootObject = JSON.parse(data);
  } catch (err) {
    terminate(`problem parsing ${armRootPath}\n${err}`);
  }
  if (rootObject.nestPath === undefined) {
    terminate(`problem parsing: ${armRootPath}\nmissing field 'nestPath'`);
  }
  return rootObject.nestPath;
}


function cdRootDirectory() {
  const startedInNestDirectory = fileExistsSync(armManifest);

  let tryParent = true;
  do {
    if (fileExistsSync(armRootFilename)) {
      return;
    }

    // NB: chdir('..') from '/' silently does nothing on Mac, so check we moved
    const cwd = process.cwd();
    process.chdir('..');
    tryParent = (cwd !== process.cwd());
  } while (tryParent);

  if (startedInNestDirectory) {
    terminate('root of forest not found. (Do you need to call "arm install"?)');
  } else {
    terminate('root of forest not found. ');
  }
}


function getRepoTypeForLocalPath(repoPath) {
  if (dirExistsSync(path.join(repoPath, '.git'))) {
    return 'git';
  } else if (dirExistsSync(path.join(repoPath, '.hg'))) {
    return 'hg';
  }

  return undefined;
}


function getOrigin(repoPath, repoTypeParam) {
  let origin;
  let repoType = repoTypeParam;
  if (repoType === undefined) {
    repoType = getRepoTypeForLocalPath(repoPath);
  }

  if (repoType === 'git') {
    try {
      origin = childProcess.execFileSync(
        'git', ['-C', repoPath, 'config', '--get', 'remote.origin.url']
      ).toString().trim();
    } catch (err) {
      // May have created repo locally and does not yet have an origin
    }
  } else if (repoType === 'hg') {
    origin = childProcess.execFileSync(
      'hg', ['--repository', repoPath, 'config', 'paths.default']
    ).toString().trim();
  }
  return origin;
}


function getBranch(repoPath, repoType) {
  let branch;
  if (repoType === 'git') {
    const unmute = mute();
    try {
      // This will fail if have detached head, but does work for an empty repo
      branch = childProcess.execFileSync(
         'git', ['symbolic-ref', '--short', 'HEAD'], { cwd: repoPath }
      ).toString().trim();
    } catch (err) {
      branch = undefined;
    }
    unmute();
  } else if (repoType === 'hg') {
    branch = childProcess.execFileSync(
      'hg', ['--repository', repoPath, 'branch']
    ).toString().trim();
  }
  return branch;
}


function getRevision(repoPath, repoType) {
  let revision;
  if (repoType === 'git') {
    revision = childProcess.execFileSync(
       'git', ['rev-parse', 'HEAD'], { cwd: repoPath }
    ).toString().trim();
  } else if (repoType === 'hg') {
    revision = childProcess.execFileSync(
      'hg', ['log', '--rev', '.', '--template', '{node}'], { cwd: repoPath }
    ).toString().trim();
  }
  return revision;
}


function readManifest(nestPath, addNestToDependencies) {
  const configPath = path.resolve(nestPath, armManifest);

  let data;
  try {
    data = fs.readFileSync(configPath);
  } catch (err) {
    terminate(`Problem opening ${configPath}\n${err}`);
  }

  let configObject;
  try {
    configObject = JSON.parse(data);
  } catch (err) {
    terminate(`Problem parsing ${configPath}\n${err}`);
  }
  if (configObject.dependencies === undefined) {
    terminate(`Problem parsing: ${configPath}\nmissing field 'dependencies'`);
  }
  if (configObject.rootDirectory === undefined) {
    terminate(`Problem parsing: ${configPath}\nmissing field 'rootDirectory'`);
  }

  const nestRepoType = getRepoTypeForLocalPath(nestPath);
  const nestOrigin = getOrigin(nestPath, nestRepoType);
  const parsedNestOrigin = parseRepository(nestOrigin);
  if (addNestToDependencies) {
    configObject.dependencies[nestPath] = { origin: nestOrigin, repoType: nestRepoType };
  }

  Object.keys(configObject.dependencies).forEach((repoPath) => {
    // Sanity check repoType so callers do not need to warn about unexpected type.
    const entry = configObject.dependencies[repoPath];
    const supportedTypes = ['git', 'hg'];
    if (supportedTypes.indexOf(entry.repoType) === -1) {
      console.log(my.errorColour(
        `Skipping entry for "${repoPath}" with unsupported repoType: ${entry.repoType}`
      ));
      delete configObject.dependencies[repoPath];
      return; // continue forEach
    }

    // Turn relative repos into absolute repos.
    if (isRelativePath(entry.origin)) {
      entry.origin = resolveOrigin(parsedNestOrigin, entry.origin);
    }
  });

  return configObject;
}


function doStatus() {
  cdRootDirectory();
  const nestPath = readNestPathFromRoot();
  const dependencies = readManifest(nestPath, true).dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    const entry = dependencies[repoPath];
    if (entry.repoType === 'git') {
      execCommandSync(
        { cmd: 'git', args: ['status', '--short'], cwd: repoPath }
      );
    } else if (entry.repoType === 'hg') {
      execCommandSync(
        { cmd: 'hg', args: ['status'], cwd: repoPath }
      );
    }
  });
}


function hgAutoMerge(repoPath) {
  // Battle tested code from hgh tool
  const headCount = childProcess.execFileSync(
    'hg', ['heads', '.', '--repository', repoPath, '--template', 'x']
  ).length;
  if (headCount === 0) {
    // Brand new repo, nothing to do
  } else if (headCount === 1) {
    // We just did a pull, so looking for an update.
    const tipNode = childProcess.execFileSync(
      'hg', ['tip', '--repository', repoPath, '--template', '{node}']
    );
    const parentNode = childProcess.execFileSync(
      'hg', ['parents', '--repository', repoPath, '--template', '{node}']
    );
    if (tipNode !== parentNode) {
      execCommandSync(
        { cmd: 'hg', args: ['update'], cwd: repoPath }
      );
    }
  } else {
    try {
      execCommandSync(
        { cmd: 'hg', args: ['merge', '--tool', 'internal:merge'], cwd: repoPath }
      );
      execCommandSync(
        { cmd: 'hg', args: ['commit', '--message', 'Merge'], cwd: repoPath }
      );
    } catch (err) {
      if (err.status === 1) {
        console.log(my.errorColour('NB: unresolved conflicts'));
        console.log('');
      } else {
        throw err;
      }
    }
  }
}


function doPull() {
  cdRootDirectory();
  const nestPath = readNestPathFromRoot();
  const dependencies = readManifest(nestPath, true).dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    const entry = dependencies[repoPath];
    if (entry.pinRevision !== undefined) {
      console.log(`Skipping pinned repo: ${repoPath}\n`);
    } else if (getBranch(repoPath, entry.repoType) === undefined) {
      console.log(`Skipping repo with detached HEAD: ${repoPath}\n`);
    } else {
      const repoType = entry.repoType;
      if (repoType === 'git') {
        execCommandSync(
          { cmd: 'git', args: ['pull'], cwd: repoPath }
        );
      } else if (repoType === 'hg') {
        execCommandSync(
          { cmd: 'hg', args: ['pull'], cwd: repoPath }
        );
        hgAutoMerge(repoPath);
      }
    }
  });
}


function doOutgoing() {
  cdRootDirectory();
  const nestDirectory = readNestPathFromRoot();
  const dependencies = readManifest(nestDirectory, true).dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    const repoType = dependencies[repoPath].repoType;
    if (repoType === 'git') {
      execCommandSync(
        // http://stackoverflow.com/questions/2016901/viewing-unpushed-git-commits
        // Started with "git log @{u}.." but that fails for detached head."
        // The following does not list changes which have been pushed to some but not all branches,
        // but otherwise pretty cool!
        { cmd: 'git',
          args: ['log', '--branches', '--not', '--remotes', '--decorate', '--oneline'],
          cwd: repoPath }
        // log
      );
    } else if (repoType === 'hg') {
      // Outgoing returns 1 if there are no outgoing changes.
      execCommandSync(
        { cmd: 'hg',
          args: ['outgoing', '--quiet', '--template', '{node|short} {desc|firstline}\n'],
          cwd: repoPath,
          allowedShellStatus: 1,
        }
      );
    }
  });
}


function doSwitch(branch) {
  cdRootDirectory();
  const nestDirectory = readNestPathFromRoot();
  const dependencies = readManifest(nestDirectory, true).dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    const entry = dependencies[repoPath];
    if (entry.lockBranch !== undefined || entry.pinRevision !== undefined) {
      return; // continue forEach
    }

    const repoType = entry.repoType;
    if (repoType === 'git') {
      execCommandSync(
        { cmd: 'git', args: ['checkout', branch], cwd: repoPath }
      );
    } else if (repoType === 'hg') {
      execCommandSync(
        { cmd: 'hg', args: ['update', branch], cwd: repoPath }
      );
    }
  });
}


function doMakeBranch(branch, startPoint, publish) {
  cdRootDirectory();
  const nestDirectory = readNestPathFromRoot();
  const dependencies = readManifest(nestDirectory, true).dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    const entry = dependencies[repoPath];
    if (entry.lockBranch !== undefined || entry.pinRevision !== undefined) {
      return; // continue forEach
    }

    const repoType = entry.repoType;
    if (repoType === 'git') {
      // Could check for remote branch using "git fetch origin ${branch}" ?
      const args = ['checkout', '-b', branch];
      if (startPoint !== undefined) args.push(startPoint);
      execCommandSync({ cmd: 'git', args, cwd: repoPath });
      if (publish) {
        execCommandSync(
          { cmd: 'git', args: ['push', '--set-upstream', 'origin', branch], cwd: repoPath }
        );
      }
    } else if (repoType === 'hg') {
      if (startPoint !== undefined) {
        execCommandSync({ cmd: 'hg', args: ['update', startPoint], cwd: repoPath });
      }
      execCommandSync({ cmd: 'hg', args: ['branch', branch], cwd: repoPath });
      if (publish) {
        execCommandSync(
          { cmd: 'hg', args: ['commit', '--message', 'Create branch'], cwd: repoPath }
        );
        execCommandSync(
          { cmd: 'hg', args: ['push', '--branch', branch, '--new-branch'], cwd: repoPath }
        );
      }
    }
  });
}


function cloneEntry(entry, repoPath, freeBranch) {
  // Determine target branch for clone
  let branch;
  if (entry.pinRevision !== undefined) {
    console.log(`# ${repoPath}: cloning pinned revision`);
    branch = undefined;
  } else if (entry.lockBranch !== undefined) {
    console.log(`# ${repoPath}: cloning locked branch`);
    branch = entry.lockBranch;
  } else if (freeBranch !== undefined) {
    console.log(`# ${repoPath}: cloning free repo on requested branch`);
    branch = freeBranch;
  } else {
    console.log(`# ${repoPath}: cloning free repo`);
  }

  const args = ['clone'];
  if (branch !== undefined) {
    if (entry.repoType === 'git') {
      args.push('--branch', branch);
    } if (entry.repoType === 'hg') {
      args.push('--updaterev', branch);
    }
  }

  // Suppress checkout for pinRevision
  if (entry.pinRevision !== undefined) {
    if (entry.repoType === 'git') {
      args.push('--no-checkout');
    } if (entry.repoType === 'hg') {
      args.push('--noupdate');
    }
  }
  args.push(entry.origin, repoPath);
  // Clone command ready!
  execCommandSync({ cmd: entry.repoType, args, suppressContext: true });

  // Second commnd to checkout pinned revision
  if (entry.pinRevision !== undefined) {
    if (entry.repoType === 'git') {
      execCommandSync(
        { cmd: 'git', args: ['checkout', '--quiet', entry.pinRevision], cwd: repoPath }
      );
    } else if (entry.repoType === 'hg') {
      execCommandSync(
        { cmd: 'git', args: ['update', '--rev', entry.pinRevision], cwd: repoPath }
      );
    }
  }
}


// function tryParseAllGitFormats() {
//   // See GIT URLS on https://git-scm.com/docs/git-clone
//   const testURLS = [
//     'ssh://user@host.xz:123/path/to/repo.git/',
//     'git://host.xz:123/path/to/repo.git/',
//     'http://host.xz:123/path/to/repo.git/',
//     'https://host.xz:123/path/to/repo.git/',
//     'ftp://host.xz:123/path/to/repo.git/',
//     'ftps://host.xz:123/path/to/repo.git/',
//     'user@host.xz:path/to/repo.git/',
//     'host.xz:path/to/repo.git/',
//     '/path/to/repo.git/',
//     'file:///path/to/repo.git/',
//   ];
//   console.log('=== Trying git url formats ===');
//   testURLS.forEach((repoPath) => {
//     console.log(`Parsing ${repoPath}`);
//     const parsed = parseRepository(repoPath);
//     console.log(`  ${parsed.protocol} ${parsed.pathname}`);
//   });
// }


// function tryParseAllHgFormats() {
//   // From "hg help urls". These can all have #revision on end.
//   const testURLS = [
//     'local/filesystem/path',
//     'file://local/filesystem/path',
//     'http://user:pass@host:123/path',
//     'https://user:pass@host:123/path',
//     'ssh://user@host:123/path',
//   ];
//   console.log('=== Trying hg url formats ===');
//   testURLS.forEach((repoPath) => {
//     console.log(`Parsing ${repoPath}`);
//     let parsed = parseRepository(repoPath);
//     console.log(`  ${parsed.protocol} ${parsed.pathname}`);
//
//     const qualified = `${repoPath}#revision`;
//     console.log(`Parsing ${qualified}`);
//     parsed = parseRepository(qualified);
//     console.log(`  ${parsed.protocol} ${parsed.pathname}`);
//   });
// }


function writeRootFile(rootFilePath, nestPath) {
  let initialisedWord = 'Initialised';
  if (fileExistsSync(rootFilePath)) initialisedWord = 'Reinitialised';
  const rootObject = { nestPath };
  const prettyRootObject = JSON.stringify(rootObject, null, '  ');
  fs.writeFileSync(rootFilePath, prettyRootObject);
  if (nestPath === '') {
    console.log(`${initialisedWord} marker file at root of forest: ${armRootFilename}`);
  } else {
    console.log(`${initialisedWord} marker file at root of forest: ${rootFilePath}`);
  }
}


function doInstall(freeBranch) {
  let configObject;
  if (fileExistsSync(armManifest)) {
    // Probably being called during setup, before root file added.
    configObject = readManifest('.');
    const rootAbsolutePath = path.resolve(configObject.rootDirectory);
    const nestFromRoot = path.relative(rootAbsolutePath, process.cwd());
    writeRootFile(path.join(rootAbsolutePath, armRootFilename), nestFromRoot);
    console.log();
  }

  cdRootDirectory();
  const nestPath = readNestPathFromRoot();
  if (configObject === undefined) configObject = readManifest(nestPath);
  const dependencies = configObject.dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    if (dirExistsSync(repoPath)) {
      console.log(`Skipping already present dependency: ${repoPath}`);
    } else {
      const entry = dependencies[repoPath];
      cloneEntry(entry, repoPath, freeBranch);
    }
  });
}


function findRepositories(startingDirectory, callback) {
  if (startingDirectory === '.hg' || startingDirectory === '.git') {
    return; // No point searching inside control folders
  }

  const itemList = fs.readdirSync(startingDirectory);
  itemList.forEach((item) => {
    const itemPath = path.join(startingDirectory, item);
    if (dirExistsSync(itemPath)) {
      if (dirExistsSync(path.join(itemPath, '.git'))) {
        callback(itemPath, 'git');
      } else if (dirExistsSync(path.join(itemPath, '.hg'))) {
        callback(itemPath, 'hg');
      }

      // Keep searching in case of nested repos.
      findRepositories(itemPath, callback);
    }
  });
}


function doInit(rootDirParam) {
  const configPath = path.resolve(armManifest);
  if (fileExistsSync(configPath)) {
    console.log(`Skipping init, already have ${armManifest}`);
    console.log('(Delete it to start over, or did you want "arm install"?)');
    return;
  }

  // Find nest origin, if we can.
  const nestRepoType = getRepoTypeForLocalPath('.');
  if (nestRepoType === undefined) {
    terminate('Expecting current directory to have a repository. (KISS)');
  }
  const nestOrigin = getOrigin('.', nestRepoType);
  let parsedNestOrigin;
  if (nestOrigin === undefined) {
    console.log(my.errorColour('(origin not specified for starting repo)'));
  } else {
    parsedNestOrigin = parseRepository(nestOrigin);
  }

  // Sort out nest and root paths
  const nestAbsolutePath = process.cwd();
  let rootAbsolutePath;
  if (rootDirParam === undefined) {
    rootAbsolutePath = process.cwd();
    console.log('Scanning for nested dependencies…');
  } else {
    rootAbsolutePath = path.resolve(rootDirParam);
    console.log('Scanning for dependencies from root…');
  }
  const nestFromRoot = path.relative(rootAbsolutePath, nestAbsolutePath);
  const rootFromNest = path.relative(nestAbsolutePath, rootAbsolutePath);

  // Dependencies (implicitly finds nest too, but that gets deleted)
  process.chdir(rootAbsolutePath);
  const dependencies = {};
  findRepositories('.', (repoPath, repoType) => {
    console.log(`  ${repoPath}`);
    const origin = getOrigin(repoPath, repoType);
    const entry = { origin, repoType };

    if (origin === undefined) {
      console.log(my.errorColour('    (origin not specified)'));
    } else {
      const parsedOrigin = parseRepository(origin);
      // We are doing simple auto detection of relative path, siblings on server
      if (sameParsedOriginDir(parsedOrigin, parsedNestOrigin)) {
        console.log('    (free)');
        // Like git submodule, require relative paths to start with ./ or ../
        const relativePath = path.posix.relative(parsedNestOrigin.pathname, parsedOrigin.pathname);
        if (isRelativePath(relativePath)) {
          entry.origin = relativePath;
        }
      } else {
        const lockBranch = getBranch(repoPath, repoType);
        if (lockBranch === undefined) {
          const revision = getRevision(repoPath, repoType);
          console.log(`    (pinned revision to ${revision})`);
          entry.pinRevision = revision;
        } else {
          console.log(`    (locked branch to ${lockBranch})`);
          entry.lockBranch = lockBranch;
        }
      }
      dependencies[repoPath] = entry;
    }
  });
  delete dependencies[nestFromRoot];
  const config = { dependencies, rootDirectory: rootFromNest, nestPathFromRoot: nestFromRoot };
  const prettyConfig = JSON.stringify(config, null, '  ');

  fs.writeFileSync(configPath, prettyConfig);
  console.log(`Initialised dependencies in ${armManifest}`);

  // Root placeholder file. Safe to overwrite as low content.
  writeRootFile(path.join(rootAbsolutePath, armRootFilename), nestFromRoot);

  // Offer clue for possible sibling init situation.
  if (Object.keys(dependencies).length === 0) {
    console.log('(No dependencies found. For a sibling repo layout use "arm init --root ..")');
  }
}


function doClone(source, destinationParam, options) {
  // We need to know the nest directory to find the config file after the clone.
  let destination = destinationParam;
  if (destination === undefined) {
    destination = path.posix.basename(parseRepository(source).pathname, '.git');
  }

  // Clone source.
  const nestEntry = { origin: source };
  if (isGitRepository(source)) {
    nestEntry.repoType = 'git';
  } else if (isHgRepository(source)) {
    nestEntry.repoType = 'hg';
  }
  cloneEntry(nestEntry, destination, options.branch);

  if (!fileExistsSync(path.join(destination, armManifest))) {
    terminate(`Warning: stopping as did not find manifest ${armManifest}`);
  }

  const manifest = readManifest(destination);
  if (manifest.nestPathFromRoot !== undefined && manifest.nestPathFromRoot !== '') {
    // Play shell game for sibling layout, using destination as a wrapper folder.
    console.log('Using sibling repo layout');
    const tempDir = fs.mkdtempSync('./');
    fs.renameSync(destination, path.join(tempDir, destination));
    fs.mkdirSync(destination);
    const nestPathFromHere = path.join(destination, manifest.nestPathFromRoot);
    fs.renameSync(path.join(tempDir, destination), nestPathFromHere);
    fs.rmdirSync(tempDir);
    process.chdir(nestPathFromHere);
  } else {
    process.chdir(destination);
  }

  doInstall(options.branch);

  console.log(`Created repo forest in ${destination}`);
}


function doForEach(internalOptions, args) {
  if (args.length === 0) terminate('No foreach command specified');
  const cmd = args.shift();

  cdRootDirectory();
  const nestPath = readNestPathFromRoot();
  const dependencies = readManifest(nestPath, true).dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    if (internalOptions.freeOnly) {
      const entry = dependencies[repoPath];
      if (entry.lockBranch !== undefined || entry.pinRevision !== undefined) {
        return; // continue forEach
      }
    }

    if (args.length > 0) {
      execCommandSync(
        { cmd, args, cwd: repoPath }
      );
    } else {
      execCommandSync(
        { cmd, cwd: repoPath }
      );
    }
  });
}


function doSnapshot() {
  cdRootDirectory();
  const nestPath = readNestPathFromRoot();
  const manifest = readManifest(nestPath);

  // Create dependencies with fixed revision and absolute repo.
  const dependencies = {};
  Object.keys(manifest.dependencies).forEach((repoPath) => {
    const entry = manifest.dependencies[repoPath];
    dependencies[repoPath] = {
      origin: getOrigin(repoPath, entry.repoType), // KISS, want absolute
      repoType: entry.repoType,
      pinRevision: getRevision(repoPath, entry.repoType),
    };
  });
  const snapshot = {
    dependencies,
    rootDirectory: manifest.rootDirectory,
    nestPathFromRoot: manifest.nestPathFromRoot,
  };

  let nestPathNotBlank = nestPath;
  if (nestPathNotBlank === '') nestPathNotBlank = '.';
  const nestRepoType = getRepoTypeForLocalPath(nestPathNotBlank);
  snapshot.nestRepo = {
    origin: getOrigin(nestPathNotBlank, nestRepoType),
    repoType: nestRepoType,
    pinRevision: getRevision(nestPathNotBlank, nestRepoType),
  };

  const prettySnapshot = JSON.stringify(snapshot, null, '  ');
  console.log(prettySnapshot);
}


function doRecreate(snapshotPath, destinationParam) {
  if (!fileExistsSync(snapshotPath)) terminate('Snapshot file not found');

  // Read snapshot
  let data;
  try {
    data = fs.readFileSync(snapshotPath);
  } catch (err) {
    terminate(`Problem opening ${snapshotPath}\n${err}`);
  }
  let snapshotObject;
  try {
    snapshotObject = JSON.parse(data);
  } catch (err) {
    terminate(`Problem parsing ${snapshotPath}\n${err}`);
  }

  const nestRepoEntry = snapshotObject.nestRepo;

  let destination = destinationParam;
  if (destination === undefined) {
    destination = path.posix.basename(parseRepository(nestRepoEntry.origin).pathname, '.git');
  }

  // Clone nest repo first
  if (snapshotObject.nestPathFromRoot !== undefined && snapshotObject.snapshotObject !== '') {
    // Sibling layout. Make wrapper directory.
    fs.mkdirSync(destination);
    process.chdir(destination);
    destination = snapshotObject.nestPathFromRoot;
  }
  cloneEntry(nestRepoEntry, destination);

  // Clone dependent repos
  const dependencies = snapshotObject.dependencies;
  Object.keys(dependencies).forEach((repoPath) => {
    const entry = dependencies[repoPath];
    cloneEntry(entry, repoPath);
  });

  // Install root file
  const rootAbsolutePath = path.resolve(destination, snapshotObject.rootDirectory);
  const nestFromRoot = path.relative(rootAbsolutePath, path.resolve(destination));
  writeRootFile(path.join(rootAbsolutePath, armRootFilename), nestFromRoot);
}


//------------------------------------------------------------------------------
// Command line processing

program
  .version(myPackage.version);

// Extra help
program.on('--help', () => {
  console.log('  Files:');
  console.log(
    `    ${armManifest} manifest file for forest`);
  console.log(`    ${armRootFilename} marks root of forest`);
  console.log('');
  console.log('  Commands starting with an underscore are still in development.');
  console.log('  See https://github.com/JohnRGee/arm.git for usage overview.');
  console.log("  See also 'arm <command> --help' for command options and further help.");
  console.log('');
});

program
  .command('clone <source> [destination]')
  .option('-b, --branch <branchname>', 'branch to checkout for free repos')
  .description('clone source and install its dependencies')
  .action((source, destination, options) => {
    gRecognisedCommand = true;
    doClone(source, destination, options);
  });

program
  .command('init')
  .option('--root <dir>', 'root directory of forest if not current directory')
  .description('add manifest in current directory, and marker file at root of forest')
  .on('--help', () => {
    console.log('  Use init to create the manifest based on your current sandpit. ');
    console.log('  Run from your main repo and it finds the dependent repos.');
    console.log('');
    console.log('  Examples:');
    console.log('    For a forest layout with dependent repos nested in the main repo:');
    console.log('         arm init');
    console.log('');
    console.log('    For a forest layout with sibling repositories:');
    console.log('         arm init --root ..');
  })
  .action((options) => {
    gRecognisedCommand = true;
    assertNoArgs();
    doInit(options.root);
  });

program
  .command('install')
  .option('-b, --branch <branchname>', 'branch to checkout for free dependent repos')
  .description('clone missing (new) dependent repositories')
  .action((options) => {
    gRecognisedCommand = true;
    assertNoArgs();
    doInstall(options.branch);
  });

program
  .command('outgoing')
  .description('show new changesets that have not been pushed')
  .action(() => {
    gRecognisedCommand = true;
    assertNoArgs();
    doOutgoing();
  });

program
  .command('pull')
  .description('git-style pull, which is fetch and merge')
  .on('--help', () => {
    console.log('  Target repos: free and branch-locked, excludes repos pinned to a revision');
  })
  .action(() => {
    gRecognisedCommand = true;
    assertNoArgs();
    doPull();
  });

program
  .command('root')
  .description('show the root directory of the forest')
  .action(() => {
    gRecognisedCommand = true;
    assertNoArgs();
    cdRootDirectory();
    console.log(process.cwd());
  });

program
  .command('status')
  .description('show concise status for each repo in the forest')
  .action(() => {
    gRecognisedCommand = true;
    assertNoArgs();
    doStatus();
  });

program
  .command('for-each')
  .description('run specified command on each repo in the forest, e.g. "arm foreach -- pwd"')
  .arguments('[command...]')
  .action((command) => {
    gRecognisedCommand = true;
    doForEach({}, command);
  });

program
  .command('for-free')
  .description('run specified command on repos which are not locked or pinned')
  .arguments('[command...]')
  .action((command) => {
    gRecognisedCommand = true;
    doForEach({ freeOnly: true }, command);
  });

program
  .command('_snapshot')
  .alias('ss')
  .description('display state of forest')
  .action(() => {
    gRecognisedCommand = true;
    doSnapshot();
  });

program
  .command('_recreate <snapshot> [destination]')
  .description('clone repos to recreate forest in past state')
  .action((snapshot, destination) => {
    gRecognisedCommand = true;
    doRecreate(snapshot, destination);
  });

program
  .command('_switch <branch>')
  .description('switch branch of free repos')
  .action((branch) => {
    gRecognisedCommand = true;
    doSwitch(branch);
  });

program
  .command('_make-branch <branch> [start_point]')
  .option('-p, --publish', 'push newly created branch')
  .description('create new branch')
  .action((branch, startPoint, options) => {
    gRecognisedCommand = true;
    doMakeBranch(branch, startPoint, options.publish);
  });

// Hidden command for trying things out
program
  .command('_test', null, { noHelp: true })
  .description('test')
  .action(() => {
    gRecognisedCommand = true;
    // tryParseAllGitFormats();
    // tryParseAllHgFormats();
    console.log(path.posix.relative('a', 'b'));
  });

program.parse(process.argv);

// Show help if no command specified.
if (process.argv.length === 2) {
  program.help();
}

// Error2 in the same style as command uses for unknown option
if (!gRecognisedCommand) {
  console.log('');
  console.log(`  error: unknown command \`${process.argv[2]}'`);
  console.log('');
  process.exit(1);
}
