// Ideally git commands in this file should be plumbing rather than porcelain.
// Reference list: https://git.github.io/htmldocs/git.html
// (Some porcelain have --porcelain flag to make more usable for other porcelain, i.e. as plumbing!)

import * as childProcess from "child_process";
import * as fs from "fs";
import * as path from "path";
// Mine
import * as dvcsUrl from "./dvcs-url";
import * as util from "./util";

export type RepoType = "git" | "hg";

export function getRepoTypeForLocalPath(repoPath: string): RepoType {
  // Low fidelity check, just look for clues and not spin up git/hg.
  if (fs.existsSync(path.join(repoPath, ".git"))) {
    return "git";
  } else if (fs.existsSync(path.join(repoPath, ".hg"))) {
    return "hg";
  } else if (path.extname(repoPath) === ".git") {
    // likely a bare repo
    return "git";
  }

  // Fairly hardcore to terminate, but saves handling everywhere
  // and only calling when expecting an answer.
  return util.terminate(`failed to find repository type for ${repoPath}`);
}

export function getRepoTypeForParams(
  repoPath: string,
  repoType?: RepoType,
): RepoType {
  if (repoType === undefined) {
    return getRepoTypeForLocalPath(repoPath);
  }
  return repoType;
}

export function isGitRepository(repository: string): boolean {
  try {
    // Handle local repos ourselves, as ls-remote only intended for remote repositories.
    const parsed = dvcsUrl.parse(repository);
    if (parsed.protocol === "path-posix" || parsed.protocol === "path-win32") {
      return (
        fs.existsSync(path.join(repository, ".git")) ||
        path.extname(repository) === ".git"
      );
    }
    // KISS and get git to check. Hard to be definitive by hand, especially with scp URLs.
    childProcess.execFileSync("git", ["ls-remote", repository], {
      stdio: "ignore",
    });
    return true;
  } catch (err) {
    return false;
  }
}

export function isHgRepository(repository: string): boolean {
  try {
    // KISS and get hg to check. Hard to be definitive by hand, especially with scp URLs.
    childProcess.execFileSync("hg", ["id", repository], { stdio: "ignore" });
    return true;
  } catch (err) {
    return false;
  }
}

export function getOrigin(
  repoPath: string,
  repoTypeParam?: RepoType,
): string | undefined {
  let origin;
  const repoType = getRepoTypeForParams(repoPath, repoTypeParam);

  try {
    if (repoType === "git") {
      origin = childProcess
        .execFileSync("git", ["config", "--get", "remote.origin.url"], {
          cwd: repoPath,
        })
        .toString()
        .trim();
    } else if (repoType === "hg") {
      origin = childProcess
        .execFileSync("hg", ["config", "paths.default"], { cwd: repoPath })
        .toString()
        .trim();
    }
  } catch (err) {
    // May have created repo locally and does not yet have an origin
  }

  return origin;
}

export function getBranch(
  repoPath: string,
  repoTypeParam?: RepoType,
): string | undefined {
  let branch;
  const repoType = getRepoTypeForParams(repoPath, repoTypeParam);

  if (repoType === "git") {
    try {
      // This will fail if have detached head, but does work for an empty repo.
      branch = childProcess
        .execFileSync("git", ["symbolic-ref", "--short", "HEAD"], {
          cwd: repoPath,
          stdio: ["pipe", "pipe", "ignore"],
        })
        .toString()
        .trim();
    } catch (err) {
      branch = undefined;
    }
  } else if (repoType === "hg") {
    branch = childProcess
      .execFileSync("hg", ["branch"], { cwd: repoPath })
      .toString()
      .trim();
  }
  return branch;
}

export function getRevision(
  repoPath: string,
  repoTypeParam?: RepoType,
): string | undefined {
  let revision: string | undefined = "";
  const repoType = getRepoTypeForParams(repoPath, repoTypeParam);

  if (repoType === "git") {
    try {
      // This will throw noisily in an empty repo, but does work for a detached head.
      revision = childProcess
        .execFileSync("git", ["rev-list", "--max-count=1", "HEAD"], {
          cwd: repoPath,
          stdio: ["pipe", "pipe", null],
        })
        .toString()
        .trim();
    } catch (err) {
      revision = undefined;
    }
  } else if (repoType === "hg") {
    revision = childProcess
      .execFileSync("hg", ["log", "--rev", ".", "--template", "{node}"], {
        cwd: repoPath,
      })
      .toString()
      .trim();
  }
  return revision;
}

export function getExistingRevision(
  repoPath: string,
  repoTypeParam?: RepoType,
): string {
  const revision = getRevision(repoPath, repoTypeParam);
  if (revision === undefined) {
    return util.terminate(`failed to find revision for ${repoPath}`);
  }
  return revision;
}
