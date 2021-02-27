import * as childProcess from "child_process";
import * as fs from "fs";
// Mine
import * as completion from "./completion";
import * as core from "./core";
import * as coreClone from "./core-clone";
import * as repo from "./repo";
import * as util from "./util";

export interface MakeBranchOptions {
  publish?: boolean;
}


export function doMakeBranch(branch: string, startPoint?: string, optionsParam?: MakeBranchOptions): void {
  const options: MakeBranchOptions = Object.assign({ }, optionsParam);

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


export function doSwitch(branch: string): void {
  const startDir = process.cwd();
  core.cdRootDirectory();

  // Switch free repos is easy when manifest stays the same.
  // Lots of extra code to cope with the various manifest changes.
  // (Do not actually need switchOneRepo, could just call noisier coreClone.checkoutEntry.)

  const beforeManifest = core.readManifest({ fromRoot: true });
  switchOneRepo(branch, repo.getRepoTypeForLocalPath(beforeManifest.seedPathFromRoot), beforeManifest.seedPathFromRoot);
  const beforeDependencies = beforeManifest.dependencies;
  const afterDependencies = core.readManifest({ fromRoot: true }).dependencies;

  // Repo listed in manifest before and after branch change.
  if (beforeDependencies !== undefined && afterDependencies !== undefined) {
    Object.keys(beforeDependencies).forEach((repoPath) => {
      const entryAfter = afterDependencies[repoPath];
      if (entryAfter !== undefined) {
        const entryBefore = beforeDependencies[repoPath];
        if (entryAfter.lockBranch === undefined && entryAfter.pinRevision === undefined) {
          // Switch branch of free repo.
          switchOneRepo(branch, entryAfter.repoType, repoPath);
        } else if (entryBefore.lockBranch !== entryAfter.lockBranch || entryBefore.pinRevision !== entryAfter.pinRevision) {
          // Repo changed to locked or pinned, checkout new state.
          coreClone.checkoutEntry(entryAfter, repoPath, branch);
        }
      }
    });
  }

  // Repo missing from manifest on new branch.
  if (beforeDependencies !== undefined) {
    Object.keys(beforeDependencies).forEach((repoPath) => {
      if (afterDependencies === undefined || afterDependencies[repoPath] === undefined) {
        const entryBefore = beforeDependencies[repoPath];
        if (entryBefore.lockBranch === undefined && entryBefore.pinRevision === undefined) {
          // Leave it up to caller, although tempting to change branch which might be useful during a copy-up.
          console.log(`${repoPath}: no longer in forest manifest, not changing branch\n`);
        }
      }
    });
  }

  // Repo added to manifest on new branch.
  if (afterDependencies !== undefined) {
    Object.keys(afterDependencies).forEach((repoPath) => {
      if (beforeDependencies === undefined || beforeDependencies[repoPath] === undefined) {
        const entryAfter = afterDependencies[repoPath];
        if (!fs.existsSync(repoPath)) {
          console.log(`${repoPath}: missing, run "fab install" to clone\n`);
        } else if (entryAfter.lockBranch === undefined && entryAfter.pinRevision === undefined) {
          // Switch branch of free repo.
          switchOneRepo(branch, entryAfter.repoType, repoPath);
        } else {
          // Checkout state to match branch manifest
          coreClone.checkoutEntry(entryAfter, repoPath, branch);
        }
      }
    });
  }

  process.chdir(startDir); // Simplify unit tests and reuse
}


export function completeSwitch(context: completion.CompletionContext): void {
  let branches: string[] = [];
  const startDir = process.cwd();
  core.cdRootDirectory();
  const rootObject = core.readRootFile();

  if (repo.isGitRepository(rootObject.seedPath)) {
    const gitBranches = childProcess.execFileSync(
      "git",
      ["for-each-ref", "--format=%(refname:short)", "refs/heads", "refs/remotes"],
      { cwd: rootObject.seedPath }
    ).toString().trim();
    branches = gitBranches.split("\n");
  }
  // hg...

  process.chdir(startDir);
  context.suggest(...branches);
}
