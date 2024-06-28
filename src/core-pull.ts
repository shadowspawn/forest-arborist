import * as childProcess from "child_process";
import * as process from "process";
// Mine
import * as core from "./core";
import * as repo from "./repo";
import * as util from "./util";

function hgAutoMerge(repoPath: string) {
  // Note: assuming always want merge, which implies developers avoid floating heads.
  // Rework if anyone reports using other workflows.
  const headCount = childProcess.execFileSync("hg", [
    "heads",
    ".",
    "--repository",
    repoPath,
    "--template",
    "x",
  ]).length;
  if (headCount === 0) {
    // Brand new repo, nothing to do
  } else if (headCount === 1) {
    // If there was an update, it has already been done.
  } else {
    try {
      util.execCommandSync("hg", ["merge", "--tool", "internal:merge"], {
        cwd: repoPath,
      });
      util.execCommandSync("hg", ["commit", "--message", "Merge"], {
        cwd: repoPath,
      });
    } catch (err) {
      const peekErr = err as { status?: number }; // exception includes spawnSync result
      if (peekErr.status === 1) {
        console.log(util.errorColour("NB: unresolved conflicts"));
        console.log("");
      } else {
        throw err;
      }
    }
  }
}

export async function doPull(): Promise<void> {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const forestRepos = core.readManifest({
    fromRoot: true,
    addSeedToDependencies: true,
  }).dependencies;

  const processRepo = async (
    entry: core.RepoEntry,
    helper: core.TaskHelper,
  ) => {
    const repoPath = entry.repoPath;
    const repoType = entry.repoType;
    const execOptions = { cwd: repoPath, outputConfig: helper };
    if (entry.pinRevision !== undefined) {
      console.log(`Skipping pinned repo: ${entry.repoPath}\n`);
    } else if (
      repoType === "git" &&
      repo.getBranch(repoPath, repoType) === undefined
    ) {
      console.log(`Skipping repo with detached HEAD: ${repoPath}\n`);
    } else {
      if (repoType === "git") {
        await helper.execCommand("git", ["pull"], execOptions);
      } else if (repoType === "hg") {
        await helper.execCommand("hg", ["pull", "--update"], execOptions);
        hgAutoMerge(repoPath);
      }
    }
  };

  await core.processRepos(core.toRepoArray(forestRepos), processRepo);
  process.chdir(startDir);
}
