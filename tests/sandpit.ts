import * as childProcess from "child_process";
import * as fs from "fs";
import * as fsX from "fs-extra";
import * as path from "path";
import * as repo from "../src/repo";
// Mine
import * as coreInit from "../src/core-init";


export function makePlayground(destination: string) {
  const startDir = process.cwd();

  fsX.ensureDirSync(destination);
  process.chdir(destination);
  const playgroundDir = process.cwd();

  // Make empty bare repos for remotes: free, locked, pinned, and a main for nested and sibling
  fs.mkdirSync("remotes");
  process.chdir("remotes");
  const remotesDir = process.cwd();;
  const allRemoteRepos = [
    path.join("libs", "locked.git"),
    path.join("libs", "pinned.git"),
    path.join("sibling", "main.git"),
    path.join("sibling", "free.git"),
    path.join("nested", "main.git"),
    path.join("nested", "free.git"),
  ];
  allRemoteRepos.forEach((repoPath) => {
    childProcess.execFileSync("git", ["init", "--bare", repoPath]);
  });

  // Nested forest: free, libs/locked, libs/pinned
  process.chdir(playgroundDir);
  childProcess.execFileSync("git", ["clone", path.join(remotesDir, "nested", "main.git"), "nested"]);
  process.chdir("nested");
  const nestedRoot = process.cwd();
  childProcess.execFileSync("git", ["clone", path.join(remotesDir, "nested", "free.git")]);
  childProcess.execFileSync("git", ["clone", path.join(remotesDir, "libs", "locked.git"), path.join("libs", "locked")]);
  childProcess.execFileSync("git", ["clone", path.join(remotesDir, "libs", "pinned.git"), path.join("libs", "pinned")]);

  // Setup pinned
  process.chdir(path.join(nestedRoot, "libs", "pinned"));
  childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Empty but real commit"]);
  const pinnedRevision = repo.getRevision(".");
  childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Second empty but real commit"]);
  childProcess.execFileSync("git", ["push"]);
  childProcess.execFileSync("git", ["checkout", pinnedRevision]);

  // Setup locked
  process.chdir(path.join(nestedRoot, "libs", "locked"));
  childProcess.execFileSync("git", ["checkout", "-b", "lockedBranch"]);
  childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Empty but real commit"]);
  childProcess.execFileSync("git", ["push", "--set-upstream", "origin", "lockedBranch"]);

  // Setup free
  process.chdir(path.join(nestedRoot, "free"));
  childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Empty but real commit"]);
  childProcess.execFileSync("git", ["push"]);

  // Setup main
  process.chdir(nestedRoot);
  coreInit.doInit({ })
  childProcess.execFileSync("git", ["add", ".fab"]);
  childProcess.execFileSync("git", ["commit", "-m", "fab initialised"]);
  childProcess.execFileSync("git", ["push"]);

  // Sibling forest: free, libs/locked, libs/pinned
  process.chdir(playgroundDir);
  fs.mkdirSync("sibling");
  process.chdir("sibling");
  const siblingRoot = process.cwd();

  childProcess.execFileSync("git", ["clone", path.join(remotesDir, "sibling", "main.git")]);
  childProcess.execFileSync("git", ["clone", path.join(remotesDir, "sibling", "free.git")]);
  childProcess.execFileSync("git", ["clone", path.join(remotesDir, "libs", "locked.git"), "--branch", "lockedBranch", path.join("libs", "locked")]);
  childProcess.execFileSync("git", ["clone", path.join(remotesDir, "libs", "pinned.git"), path.join("libs", "pinned")]);

  // Setup pinned
  process.chdir(path.join(siblingRoot, "libs", "pinned"));
  childProcess.execFileSync("git", ["checkout", pinnedRevision]);

  // Setup free
  process.chdir(path.join(siblingRoot, "free"));
  childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Empty but real commit"]);
  childProcess.execFileSync("git", ["push"]);

  // Setup main
  process.chdir(path.join(siblingRoot, "main"));
  coreInit.doInit({ root: ".." })
  childProcess.execFileSync("git", ["add", ".fab"]);
  childProcess.execFileSync("git", ["commit", "-m", "fab initialised"]);
  childProcess.execFileSync("git", ["push"]);

  process.chdir(startDir);
}
