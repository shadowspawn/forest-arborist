'use strict';

// Mine
const core = require('./core');
const util = require('./util');


module.exports = {


  doForEach(internalOptions, cmd, args) {
    const startDir = process.cwd();
    core.cdRootDirectory();
    const dependencies = core.readManifest(
      { fromRoot: true, addMainToDependencies: true }
    ).dependencies;

    Object.keys(dependencies).forEach((repoPath) => {
      if (internalOptions.freeOnly) {
        const entry = dependencies[repoPath];
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
