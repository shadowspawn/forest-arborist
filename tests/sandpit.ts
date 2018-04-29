import * as childProcess from "child_process";
import * as fs from "fs";
import * as fsX from "fs-extra";
import * as path from "path";
import * as repo from "../src/repo";
// Mine
import * as coreInit from "../src/core-init";


function makeGitRepoAndCd(repoPath: string) {
  childProcess.execFileSync("git", ["init", repoPath]);
  process.chdir(repoPath);
  childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Empty but real commit"]);
}


export function makePlayground(destination: string): string {
  const startDir = process.cwd();

  const playgroundDir = path.resolve(process.cwd(), destination);
  fsX.ensureDirSync(destination);

  // Nested
  console.log("\nCreating nested forest\n");
  const nestedRoot = path.resolve(playgroundDir, "nested");
  makeGitRepoAndCd(nestedRoot);

  // Setup pinned
  makeGitRepoAndCd(path.join(nestedRoot, "libs", "pinned"));
  const pinnedRevision = repo.getRevision(".");
  childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Another empty but real commit"]);
  childProcess.execFileSync("git", ["checkout", "--quiet", pinnedRevision]);

  // Setup locked
  makeGitRepoAndCd(path.join(nestedRoot, "libs", "locked"));
  childProcess.execFileSync("git", ["checkout", "--quiet", "-b", "lockedBranch"]);

  // Setup free
  makeGitRepoAndCd(path.join(nestedRoot, "free"));

  // Setup main
  process.chdir(nestedRoot);
  coreInit.doInit({ });
  childProcess.execFileSync("git", ["add", ".fab"]);
  childProcess.execFileSync("git", ["commit", "-m", "fab initialised"]);

  console.log("\nCreating remotes (so can push and pull)\n");
  const remotesDir = path.join(playgroundDir, "remotes");
  fs.mkdirSync(remotesDir);

  function makeAndSetRemote(source: string, destination: string) {
    const remotePath = path.join(remotesDir, destination);
    // childProcess.execFileSync("git", ["clone", "--quiet", "--bare", "--branch", "master", source, remotePath]);
    childProcess.execFileSync("git", ["init", "--bare", remotePath]);
    // Add origin
    childProcess.execFileSync("git", ["remote", "add", "origin", remotePath], { cwd: source });
    // Prepare all branches for push and pull
    childProcess.execFileSync("git", ["push", "--quiet", "--all", "--set-upstream", "origin"], { cwd: source });
  }

  process.chdir(nestedRoot);
  makeAndSetRemote(".", path.join("nested", "main.git"));
  makeAndSetRemote("free", path.join("nested", "free.git"));
  makeAndSetRemote(path.join("libs", "pinned"), path.join("libs", "pinned.git"));
  makeAndSetRemote(path.join("libs", "locked"), path.join("libs", "locked.git"));

  // Sibling
  console.log("\nCreating sibling forest\n");
  const siblingRoot = path.resolve(playgroundDir, "sibling");
  fs.mkdirSync(siblingRoot);

  // Setup free
  makeGitRepoAndCd(path.join(siblingRoot, "free"));

  // Setup pinned
  process.chdir(siblingRoot);
  childProcess.execFileSync("git", ["clone", "--quiet", path.join(remotesDir, "libs", "pinned.git"), path.join("libs", "pinned")]);
  childProcess.execFileSync("git", ["checkout", "--quiet", pinnedRevision], { cwd: path.join("libs", "pinned") });

  // Setup locked
  process.chdir(siblingRoot);
  childProcess.execFileSync("git", [
    "clone", "--quiet", "--branch", "lockedBranch",
    path.join(remotesDir, "libs", "locked.git"), path.join("libs", "locked")
  ]);

  // Setup main
  makeGitRepoAndCd(path.join(siblingRoot, "main"));
  coreInit.doInit({ root: ".." });
  childProcess.execFileSync("git", ["add", ".fab"]);
  childProcess.execFileSync("git", ["commit", "-m", "fab initialised"]);

  console.log("\nCreating remotes (so can push and pull)\n");
  process.chdir(siblingRoot);
  makeAndSetRemote("main", path.join("sibling", "main.git"));
  makeAndSetRemote("free", path.join("sibling", "free.git"));

  process.chdir(startDir);
  return pinnedRevision;
}
