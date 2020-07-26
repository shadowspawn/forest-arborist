import * as childProcess from "child_process";
// Mine
import * as core from "./core";
import * as repo from "./repo";
import * as util from "./util";


function hgAutoMerge(repoPath: string) {
  // Note: assuming always want merge, which implies developers avoid floating heads.
  // Rework if anyone reports using other workflows.
  const headCount = childProcess.execFileSync(
    "hg", ["heads", ".", "--repository", repoPath, "--template", "x"]
  ).length;
  if (headCount === 0) {
    // Brand new repo, nothing to do
  } else if (headCount === 1) {
    // If there was an update, it has already been done.
  } else {
    try {
      util.execCommandSync(
        "hg", ["merge", "--tool", "internal:merge"], { cwd: repoPath }
      );
      util.execCommandSync(
        "hg", ["commit", "--message", "Merge"], { cwd: repoPath }
      );
    } catch (err) {
      if (err.status === 1) {
        console.log(util.errorColour("NB: unresolved conflicts"));
        console.log("");
      } else {
        throw err;
      }
    }
  }
}


export function doPull(): void {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const forestRepos = core.readManifest(
    { fromRoot: true, addSeedToDependencies: true }
  ).dependencies;

  Object.keys(forestRepos).forEach((repoPath) => {
    const entry = forestRepos[repoPath];
    if (entry.pinRevision !== undefined) {
      console.log(`Skipping pinned repo: ${repoPath}\n`);
    } else if (entry.repoType === "git" && repo.getBranch(repoPath, entry.repoType) === undefined) {
      console.log(`Skipping repo with detached HEAD: ${repoPath}\n`);
    } else {
      const repoType = entry.repoType;
      if (repoType === "git") {
        util.execCommandSync(
          "git", ["pull"], { cwd: repoPath }
        );
      } else if (repoType === "hg") {
        util.execCommandSync(
          "hg", ["pull", "--update"], { cwd: repoPath }
        );
        hgAutoMerge(repoPath);
      }
    }
  });
  process.chdir(startDir);
}
