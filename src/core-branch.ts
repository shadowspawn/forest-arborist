// Mine
import * as core from "./core";
import * as util from "./util";

export interface MakeBranchOptions {
  publish?: boolean;
}


export function doMakeBranch(branch: string, startPoint?: string, optionsParam?: MakeBranchOptions) {
  let options: MakeBranchOptions = Object.assign({ }, optionsParam);

  const startDir = process.cwd();
  core.cdRootDirectory();
  const forestRepos = core.readManifest(
    { fromRoot: true, addSeedToDependencies: true }
  ).dependencies;

  Object.keys(forestRepos).forEach((repoPath) => {
    const entry = forestRepos[repoPath];
    if (entry.lockBranch !== undefined || entry.pinRevision !== undefined) {
      return; // continue forEach
    }

    const repoType = entry.repoType;
    if (repoType === "git") {
      // Could check for remote branch using "git fetch origin ${branch}" ?
      const args = ["checkout", "-b", branch];
      if (startPoint !== undefined) args.push(startPoint);
      util.execCommandSync("git", args, { cwd: repoPath });
      if (options.publish) {
        util.execCommandSync(
          "git", ["push", "--set-upstream", "origin", branch], { cwd: repoPath }
        );
      }
    } else if (repoType === "hg") {
      if (startPoint !== undefined) {
        util.execCommandSync("hg", ["update", startPoint], { cwd: repoPath });
      }
      util.execCommandSync("hg", ["branch", branch], { cwd: repoPath });
      if (options.publish) {
        util.execCommandSync(
          "hg", ["commit", "--message", "Create branch"], { cwd: repoPath }
        );
        util.execCommandSync(
          "hg", ["push", "--branch", branch, "--new-branch"], { cwd: repoPath }
        );
      }
    }
  });
  process.chdir(startDir); // Simplify unit tests and reuse
}


export function doSwitch(branch: string) {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const forestRepos = core.readManifest(
    { fromRoot: true, addSeedToDependencies: true }
  ).dependencies;

  Object.keys(forestRepos).forEach((repoPath) => {
    const entry = forestRepos[repoPath];
    if (entry.lockBranch !== undefined || entry.pinRevision !== undefined) {
      return; // continue forEach
    }

    const repoType = entry.repoType;
    if (repoType === "git") {
      util.execCommandSync(
         "git", ["checkout", branch], { cwd: repoPath }
      );
    } else if (repoType === "hg") {
      util.execCommandSync(
        "hg", ["update", branch], { cwd: repoPath }
      );
    }
  });
  process.chdir(startDir); // Simplify unit tests and reuse
}
