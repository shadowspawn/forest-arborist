// Mine
import * as core from "./core";
import * as repo from "./repo";
import * as util from "./util";


export interface ForOptions {
  keepgoing?: boolean;
}

export function doFor(cmd: string, args: string[], options: ForOptions, filter: (entry: core.DependencyEntry) => boolean) {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const forestRepos = core.readManifest(
    { fromRoot: true, addMainToDependencies: true }
  ).dependencies;

  Object.keys(forestRepos).forEach((repoPath) => {
    if (!filter(forestRepos[repoPath])) {
      return; // continue forEach
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
          console.log('(to keep going despite errors you can use "--keepgoing")');
        }
        throw err;
      }
    }
  });
  process.chdir(startDir); // Simplify unit tests and reuse
}


export function doForEach(cmd: string, args: string[], options: ForOptions) {
  doFor(cmd, args, options, () => {
    return true;
  });
}


export function doForFree(cmd: string, args: string[], options: ForOptions) {
  doFor(cmd, args, options, (entry) => {
    console.log(entry);
    return (entry.lockBranch === undefined && entry.pinRevision === undefined);
  });
}


export function doForGit(args: string[], options: ForOptions) {
  doFor("git", args, options, (entry) => {
    return (entry.repoType === "git");
  });
}


export function doForHg(args: string[], options: ForOptions) {
  doFor("hg", args, options, (entry) => {
    return (entry.repoType === "hg");
  });
}

