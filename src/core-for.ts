// Mine
import core = require("./core");
import util = require("./util");


export interface ForOptions {
  freeOnly?: boolean;
  keepgoing?: boolean;
}

export function doForEach(cmd: string, args: string[], options: ForOptions) {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const forestRepos = core.readManifest(
    { fromRoot: true, addMainToDependencies: true }
  ).dependencies;

  Object.keys(forestRepos).forEach((repoPath) => {
    if (options.freeOnly) {
      const entry = forestRepos[repoPath];
      if (entry.lockBranch !== undefined || entry.pinRevision !== undefined) {
        return; // continue forEach
      }
    }

    try {
      if (args.length > 0) {
        util.execCommandSync(
          { cmd, args, cwd: repoPath }
        );
      } else {
        util.execCommandSync(
          { cmd, cwd: repoPath }
        );
      }
    } catch (err) {
      if (options.keepgoing) {
        console.log(`Keeping going after caught exception with message ${err.message}`);
      } else {
        // Check whether the command was a typo before suggesting the --keepgoing option
        // `execFileSync` fails with "ENOENT" when the command being run doesn't exist
        if (err.code !== "ENOENT") {
          console.log("(to keep going despite errors use \"fab for-each --keepgoing\")");
        }
        throw err;
      }
      console.log(""); // blank line after command output
    }
  });
  process.chdir(startDir); // Simplify unit tests and reuse
}
