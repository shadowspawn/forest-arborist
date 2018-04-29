import * as childProcess from "child_process";
import * as fs from "fs";
import * as fsX from "fs-extra";
import * as path from "path";
import * as repo from "../src/repo";
// Mine
import * as coreInit from "../src/core-init";


function makeRemotes(remotesPath: string) {
  const startDir = process.cwd();
  fsX.ensureDirSync(remotesPath);
  process.chdir(remotesPath);

  const allRemoteRepos = [
    path.join("nested", "main"),
    path.join("nested", "free"),
    path.join("sibling", "main"),
    path.join("sibling", "free"),
    path.join("libs", "pinned"),
    path.join("libs", "locked"),
  ];
  allRemoteRepos.forEach((repoPath) => {
    // For ease of use, want a bare repo, but not an empty one!
    const workRepo = repoPath.concat("-work"); // Could delete after cloning...
    const bareRepo = repoPath.concat(".git");
    childProcess.execFileSync("git", ["init", workRepo]);
    childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Empty but real commit"], { cwd: workRepo });
    childProcess.execFileSync("git", ["clone", "--bare", "--quiet", workRepo, bareRepo]);
  });

  process.chdir(startDir);
}


export function makePlayground(playgroundDestination: string): string {
  const startDir = process.cwd();

  const playgroundDir = path.resolve(process.cwd(), playgroundDestination);
  fsX.ensureDirSync(playgroundDestination);

  const remotesDir = path.join(playgroundDir, "remotes");
  makeRemotes(remotesDir);

  // Nested
  console.log("\nCreating nested forest\n");
  const nestedRoot = path.join(playgroundDir, "nested");
  fs.mkdirSync(nestedRoot);
  process.chdir(nestedRoot);
  childProcess.execFileSync("git", ["clone", "--quiet", path.join(remotesDir, "nested", "main"), "."]);
  childProcess.execFileSync("git", ["clone", "--quiet", path.join(remotesDir, "nested", "free"), "free"]);
  childProcess.execFileSync("git", ["clone", "--quiet", path.join(remotesDir, "libs", "locked"), path.join("libs", "locked")]);
  childProcess.execFileSync("git", ["clone", "--quiet", path.join(remotesDir, "libs", "pinned"), path.join("libs", "pinned")]);

  // Setup pinned
  process.chdir(path.join(nestedRoot, "libs", "pinned"));
  const pinnedRevision = repo.getRevision(".");
  childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Another empty but real commit"]);
  childProcess.execFileSync("git", ["push", "--quiet"]);
  childProcess.execFileSync("git", ["checkout", "--quiet", pinnedRevision]);

  // Setup locked
  process.chdir(path.join(nestedRoot, "libs", "locked"));
  childProcess.execFileSync("git", ["checkout", "--quiet", "-b", "lockedBranch"]);
  childProcess.execFileSync("git", ["push", "--quiet", "--set-upstream", "origin", "lockedBranch"]);

  // Setup main
  process.chdir(nestedRoot);
  coreInit.doInit({ });
  childProcess.execFileSync("git", ["add", ".fab"]);
  childProcess.execFileSync("git", ["commit", "-m", "fab initialised"]);
  childProcess.execFileSync("git", ["push", "--quiet"]);

  // Sibling
  console.log("\nCreating sibling forest\n");
  const siblingRoot = path.join(playgroundDir, "sibling");
  fs.mkdirSync(siblingRoot);
  process.chdir(siblingRoot);
  childProcess.execFileSync("git", ["clone", "--quiet", path.join(remotesDir, "sibling", "main"), "main"]);
  childProcess.execFileSync("git", ["clone", "--quiet", path.join(remotesDir, "sibling", "free"), "free"]);
  childProcess.execFileSync("git", ["clone", "--quiet", path.join(remotesDir, "libs", "locked"), path.join("libs", "locked")]);
  childProcess.execFileSync("git", ["clone", "--quiet", path.join(remotesDir, "libs", "pinned"), path.join("libs", "pinned")]);

  // Setup pinned
  process.chdir(path.join(siblingRoot, "libs", "pinned"));
  childProcess.execFileSync("git", ["checkout", "--quiet", pinnedRevision]);

  // Setup locked
  process.chdir(path.join(siblingRoot, "libs", "locked"));
  childProcess.execFileSync("git", ["checkout", "--quiet", "lockedBranch"]);

  // Setup main
  process.chdir(path.join(siblingRoot, "main"));
  coreInit.doInit({ root: ".." });
  childProcess.execFileSync("git", ["add", ".fab"]);
  childProcess.execFileSync("git", ["commit", "-m", "fab initialised"]);

  process.chdir(startDir);
  return pinnedRevision;
}
