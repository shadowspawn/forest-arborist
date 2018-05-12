// Mine
import * as core from "./core";
import * as repo from "./repo";
import * as util from "./util";


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
      util.execCommandSync(
        cmd, args, { cwd: repoPath }
      );
      console.log(""); // blank line after command output
    } catch (err) {
      if (options.keepgoing) {
        console.log("");
      } else {
        // Check whether the command was a typo before suggesting the --keepgoing option
        // `execFileSync` fails with "ENOENT" when the command being run doesn't exist
        if (err.code !== "ENOENT") {
          console.log("(to keep going despite errors use \"fab for-each --keepgoing\")");
        }
        throw err;
      }
    }
  });
  process.chdir(startDir); // Simplify unit tests and reuse
}


export interface ForRepoTypeOptions {
  keepgoing?: boolean;
}

export function doForRepoType(repoType: repo.RepoType, args: string[], options: ForRepoTypeOptions) {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const forestRepos = core.readManifest(
    { fromRoot: true, addMainToDependencies: true }
  ).dependencies;

  Object.keys(forestRepos).forEach((repoPath) => {
    if (forestRepos[repoPath].repoType === repoType) {
      try {
        util.execCommandSync(
          repoType, args, { cwd: repoPath }
        );
        console.log(""); // blank line after command output
      } catch (err) {
        if (options.keepgoing) {
          console.log("");
        } else {
          console.log("(to keep going despite errors use \"fab for-each --keepgoing\")");
          throw err;
        }
      }
    }
  });

  process.chdir(startDir); // Simplify unit tests and reuse
}

