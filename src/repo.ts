import childProcess = require("child_process");
import path = require("path");
// Mine
import util = require("./util");


function getRepoTypeForParams(repoPath: string, repoType?: string) {
  if (repoType === undefined) {
    return module.exports.getRepoTypeForLocalPath(repoPath);
  }
  return repoType;
}


export function isGitRepository(repository: string) {
  try {
    // KISS and get git to check. Hard to be definitive by hand, especially with scp URLs.
    childProcess.execFileSync(
      "git", ["ls-remote", repository],
      { stdio: "ignore" }
    );
    return true;
  } catch (err) {
    return false;
  }
}


export function isHgRepository(repository: string) {
  try {
    // KISS and get hg to check. Hard to be definitive by hand, especially with scp URLs.
    childProcess.execFileSync(
      "hg", ["id", repository],
      { stdio: "ignore" }
    );
    return true;
  } catch (err) {
    return false;
  }
}


export function getRepoTypeForLocalPath(repoPath: string) {
  if (util.dirExistsSync(path.join(repoPath, ".git"))) {
    return "git";
  } else if (util.dirExistsSync(path.join(repoPath, ".hg"))) {
    return "hg";
  }

  // Fairly hardcore to terminate, but saves handling everywhere
  // and only calling when expecting an answer.
  util.terminate(`failed to find repository type for ${repoPath}`);
  return undefined;
}


export function getOrigin(repoPath: string, repoTypeParam?: string) {
  let origin;
  const repoType = getRepoTypeForParams(repoPath, repoTypeParam);

  try {
    if (repoType === "git") {
      origin = childProcess.execFileSync(
        "git", ["config", "--get", "remote.origin.url"], { cwd: repoPath }
      ).toString().trim();
    } else if (repoType === "hg") {
      origin = childProcess.execFileSync(
        "hg", ["config", "paths.default"], { cwd: repoPath }
      ).toString().trim();
    }
  } catch (err) {
    // May have created repo locally and does not yet have an origin
  }

  return origin;
}


export function getBranch(repoPath: string, repoTypeParam?: string) {
  let branch;
  const repoType = getRepoTypeForParams(repoPath, repoTypeParam);

  if (repoType === "git") {
    try {
      // This will fail if have detached head, but does work for an empty repo
      branch = childProcess.execFileSync(
        "git", ["symbolic-ref", "--short", "HEAD"], 
        { cwd: repoPath, stdio: ["pipe", "pipe", "ignore"] }
      ).toString().trim();
    } catch (err) {
      branch = undefined;
    }
  } else if (repoType === "hg") {
    branch = childProcess.execFileSync(
      "hg", ["branch"], { cwd: repoPath }
    ).toString().trim();
  }
  return branch;
}


export function getRevision(repoPath: string, repoTypeParam?: string) {
  let revision = "";
  const repoType = getRepoTypeForParams(repoPath, repoTypeParam);

  if (repoType === "git") {
    revision = childProcess.execFileSync(
      "git", ["rev-parse", "HEAD"], { cwd: repoPath }
    ).toString().trim();
  } else if (repoType === "hg") {
    revision = childProcess.execFileSync(
      "hg", ["log", "--rev", ".", "--template", "{node}"], { cwd: repoPath }
    ).toString().trim();
  }
  return revision;
}
