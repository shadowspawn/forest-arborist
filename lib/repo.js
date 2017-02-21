'use strict';

const path = require('path');
// const mute = require('mute');
const childProcess = require('child_process');
// Mine
const fsX = require('./fsExtra');
const util = require('./util');


function getRepoTypeForParams(repoPath, repoType) {
  if (repoType === undefined) {
    return module.exports.getRepoTypeForLocalPath(repoPath);
  }
  return repoType;
}


module.exports = {


  isGitRepository(repository) {
    const unmute = util.recursiveMute();
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
  },


  isHgRepository(repository) {
    const unmute = util.recursiveMute();
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
  },


  getRepoTypeForLocalPath(repoPath) {
    if (fsX.dirExistsSync(path.join(repoPath, '.git'))) {
      return 'git';
    } else if (fsX.dirExistsSync(path.join(repoPath, '.hg'))) {
      return 'hg';
    }

    // Fairly hardcore to terminate, but saves handling everywhere
    // and only calling when expecting an answer.
    util.terminate(`failed to find repository type for ${repoPath}`);
    return undefined;
  },


  getOrigin(repoPath, repoTypeParam) {
    let origin;
    const repoType = getRepoTypeForParams(repoPath, repoTypeParam);

    try {
      if (repoType === 'git') {
        origin = childProcess.execFileSync(
          'git', ['config', '--get', 'remote.origin.url'], { cwd: repoPath }
        ).toString().trim();
      } else if (repoType === 'hg') {
        origin = childProcess.execFileSync(
          'hg', ['config', 'paths.default'], { cwd: repoPath }
        ).toString().trim();
      }
    } catch (err) {
      // May have created repo locally and does not yet have an origin
    }

    return origin;
  },


  getBranch(repoPath, repoTypeParam) {
    let branch;
    const repoType = getRepoTypeForParams(repoPath, repoTypeParam);

    if (repoType === 'git') {
      const unmute = util.recursiveMute();
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
        'hg', ['branch'], { cwd: repoPath }
      ).toString().trim();
    }
    return branch;
  },


  getRevision(repoPath, repoTypeParam) {
    let revision;
    const repoType = getRepoTypeForParams(repoPath, repoTypeParam);

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
  },


};
