
import * as childProcess from "child_process";
import * as fs from "fs";
import * as path from "path";
// Mine
import * as core from "../src/core";
import * as coreInit from "../src/core-init";
import * as repo from "../src/repo";


const suiteDependencies: string[] = ["free", path.join("Libs", "pinned"), path.join("Libs", "locked")];


export function commitAndDetach(repoPath: string) {
  const startingDir = process.cwd();
  process.chdir(repoPath);
  childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Empty but real commit"]);
  const revision = repo.getExistingRevision(".");
  childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Second empty but real commit"]);
  childProcess.execFileSync("git", ["checkout", "--quiet", revision]);
  process.chdir(startingDir);
  return revision;
}


export function makeOneGitRepo(repoPath: string, origin?: string) {
  const startingDir = process.cwd();
  childProcess.execFileSync("git", ["init", repoPath]);
  process.chdir(repoPath);
  childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Empty but real commit"]);
  if (origin)
    childProcess.execFileSync("git", ["remote", "add", "origin", origin]);

  process.chdir(startingDir);
}


// Nested, direct construction of a sandpit.
export function makeNestedGitForest() {
  const startingDir = process.cwd();
  makeOneGitRepo("nested", "git@ex.com:path/to/main.git");
  process.chdir("nested");
  makeOneGitRepo("free", "git@ex.com:path/to/free.git");

  makeOneGitRepo("pinned", "git@ex.com:path/to/pinned.git");
  commitAndDetach("pinned");

  // locked (because origin path different)
  makeOneGitRepo("locked", "git@ex.com:a/b/c/locked.git");

  // fab init
  coreInit.doInit({});
  process.chdir(startingDir);
}
