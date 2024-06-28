import * as process from "process";
// Mine
import * as core from "./core";

export interface ForParallelOptions {
  jobs: number;
}

export async function doFor(
  cmd: string,
  args: string[],
  filter: (entry: core.DependencyEntry) => boolean,
) {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const forestRepos = core.readManifest({
    fromRoot: true,
    addSeedToDependencies: true,
  }).dependencies;
  const targetRepos = core
    .toRepoArray(forestRepos)
    .filter((repo) => filter(repo));

  const processRepo = async (repo: core.RepoEntry, helper: core.TaskHelper) => {
    const execOptions = { cwd: repo.repoPath, outputConfig: helper };
    await helper.execCommand(cmd, args, execOptions);
  };
  await core.processRepos(targetRepos, processRepo);

  process.chdir(startDir); // Simplify unit tests and reuse
}

export async function doForEach(cmd: string, args: string[]): Promise<void> {
  await doFor(cmd, args, () => {
    return true;
  });
}

export async function doForFree(cmd: string, args: string[]): Promise<void> {
  await doFor(cmd, args, (entry) => {
    return entry.lockBranch === undefined && entry.pinRevision === undefined;
  });
}

export async function doForGit(args: string[]): Promise<void> {
  await doFor("git", args, (entry) => {
    return entry.repoType === "git";
  });
}

export async function doForHg(args: string[]): Promise<void> {
  await doFor("hg", args, (entry) => {
    return entry.repoType === "hg";
  });
}
