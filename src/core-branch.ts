import * as fs from "fs";
// Mine
import * as core from "./core";
import * as repo from "./repo";
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


function switchOneRepo(branch: string, repoType: repo.RepoType, repoPath: string) {
  if (repoType === "git") {
    util.execCommandSync(
       "git", ["checkout", branch], { cwd: repoPath }
    );
  } else if (repoType === "hg") {
    util.execCommandSync(
      "hg", ["update", branch], { cwd: repoPath }
    );
  }
}


export function doSwitch(branch: string) {
  const startDir = process.cwd();
  core.cdRootDirectory();

  // Switch is straight forward when manifest stays the same, but care needed when repos change,
  // and not attempting to cope with changes in free/locked/pinnned for now.
  // Perhaps should be calling checkoutEntry ??

  const beforeManifest = core.readManifest({ fromRoot: true });
  switchOneRepo(branch, repo.getRepoTypeForLocalPath(beforeManifest.seedPathFromRoot), beforeManifest.seedPathFromRoot);
  const beforeDependencies = beforeManifest.dependencies;
  const afterDependencies = core.readManifest({ fromRoot: true }).dependencies;

  // Repo listed still in manifest on new branch.
  Object.keys(beforeDependencies).forEach((repoPath) => {
    const entryAfter = afterDependencies[repoPath];
    if (entryAfter !== undefined && entryAfter.lockBranch === undefined && entryAfter.pinRevision === undefined) {
      switchOneRepo(branch, entryAfter.repoType, repoPath);
    }
  });

  // Repo missing from manifest on new branch.
  Object.keys(beforeDependencies).forEach((repoPath) => {
    const entryBefore = beforeDependencies[repoPath];
    const entryAfter = afterDependencies[repoPath];
    if (entryAfter === undefined && entryBefore.lockBranch === undefined && entryBefore.pinRevision === undefined) {
      // Leave it up to caller, although tempting to change branch which might be useful during a copy-up.
      console.log(`${repoPath}: no longer in forest manifest, not changing branch\n`);
    }
  });

  // Repo added to manifest on new branch.
  Object.keys(afterDependencies).forEach((repoPath) => {
    const entryBefore = beforeDependencies[repoPath];
    const entryAfter = afterDependencies[repoPath];
    if (entryBefore === undefined) {
      if (!fs.existsSync(repoPath)) {
        console.log(`${repoPath}: missing, run \"fab install\" to clone\n`);
      } else if (entryAfter.lockBranch === undefined && entryAfter.pinRevision === undefined) {
        switchOneRepo(branch, entryAfter.repoType, repoPath);
      }
    }
  });

  process.chdir(startDir); // Simplify unit tests and reuse
}
