'use strict';

// Mine
const core = require('./core');
const util = require('./util');


module.exports = {


  doForEach(internalOptions, cmd, args) {
    const startDir = process.cwd();
    core.cdRootDirectory();
    const forestRepos = core.readManifest(
      { fromRoot: true, addMainToDependencies: true }
    ).dependencies;

    Object.keys(forestRepos).forEach((repoPath) => {
      if (internalOptions.freeOnly) {
        const entry = forestRepos[repoPath];
        if (entry.lockBranch !== undefined || entry.pinRevision !== undefined) {
          return; // continue forEach
        }
      }

      if (args.length > 0) {
        util.execCommandSync(
          { cmd, args, cwd: repoPath }
        );
      } else {
        util.execCommandSync(
          { cmd, cwd: repoPath }
        );
      }
    });
    process.chdir(startDir); // Simplify unit tests and reuse
  },


};
