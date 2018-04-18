import * as childProcess from "child_process";
// Mine
import * as core from "./core";
import * as repo from "./repo";
import * as util from "./util";


function hgAutoMerge(repoPath: string) {
  // Battle tested code from hgh tool
  const headCount = childProcess.execFileSync(
    "hg", ["heads", ".", "--repository", repoPath, "--template", "x"]
  ).length;
  if (headCount === 0) {
    // Brand new repo, nothing to do
  } else if (headCount === 1) {
    // We just did a pull, so looking for an update.
    const tipNode = childProcess.execFileSync(
      "hg", ["tip", "--repository", repoPath, "--template", "{node}"]
    );
    const parentNode = childProcess.execFileSync(
      "hg", ["parents", "--repository", repoPath, "--template", "{node}"]
    );
    if (tipNode !== parentNode) {
      util.execCommandSync(
        { cmd: "hg", args: ["update"], cwd: repoPath }
      );
    }
  } else {
    try {
      util.execCommandSync(
        { cmd: "hg", args: ["merge", "--tool", "internal:merge"], cwd: repoPath }
      );
      util.execCommandSync(
        { cmd: "hg", args: ["commit", "--message", "Merge"], cwd: repoPath }
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


export function doPull() {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const forestRepos = core.readManifest(
    { fromRoot: true, addMainToDependencies: true }
  ).dependencies;

  Object.keys(forestRepos).forEach((repoPath) => {
    const entry = forestRepos[repoPath];
    if (entry.pinRevision !== undefined) {
      console.log(`Skipping pinned repo: ${repoPath}\n`);
    } else if (repo.getBranch(repoPath, entry.repoType) === undefined) {
      console.log(`Skipping repo with detached HEAD: ${repoPath}\n`);
    } else {
      const repoType = entry.repoType;
      if (repoType === "git") {
        util.execCommandSync(
          { cmd: "git", args: ["pull"], cwd: repoPath }
        );
      } else if (repoType === "hg") {
        util.execCommandSync(
          { cmd: "hg", args: ["pull"], cwd: repoPath }
        );
        hgAutoMerge(repoPath);
      }
    }
  });
  process.chdir(startDir);
}
