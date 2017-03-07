// Mine
import core = require("./core");
import util = require("./util");


export function doMakeBranch(branch: string, startPoint: undefined | string, publish: undefined | boolean) {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const forestRepos = core.readManifest(
    { fromRoot: true, addMainToDependencies: true }
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
      util.execCommandSync({ cmd: "git", args, cwd: repoPath });
      if (publish) {
        util.execCommandSync(
          { cmd: "git", args: ["push", "--set-upstream", "origin", branch], cwd: repoPath }
        );
      }
    } else if (repoType === "hg") {
      if (startPoint !== undefined) {
        util.execCommandSync({ cmd: "hg", args: ["update", startPoint], cwd: repoPath });
      }
      util.execCommandSync({ cmd: "hg", args: ["branch", branch], cwd: repoPath });
      if (publish) {
        util.execCommandSync(
          { cmd: "hg", args: ["commit", "--message", "Create branch"], cwd: repoPath }
        );
        util.execCommandSync(
          { cmd: "hg", args: ["push", "--branch", branch, "--new-branch"], cwd: repoPath }
        );
      }
    }
  });
  process.chdir(startDir); // Simplify unit tests and reuse
};


export function doSwitch(branch: string) {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const forestRepos = core.readManifest(
    { fromRoot: true, addMainToDependencies: true }
  ).dependencies;

  Object.keys(forestRepos).forEach((repoPath) => {
    const entry = forestRepos[repoPath];
    if (entry.lockBranch !== undefined || entry.pinRevision !== undefined) {
      return; // continue forEach
    }

    const repoType = entry.repoType;
    if (repoType === "git") {
      util.execCommandSync(
        { cmd: "git", args: ["checkout", branch], cwd: repoPath }
      );
    } else if (repoType === "hg") {
      util.execCommandSync(
        { cmd: "hg", args: ["update", branch], cwd: repoPath }
      );
    }
  });
  process.chdir(startDir); // Simplify unit tests and reuse
};
