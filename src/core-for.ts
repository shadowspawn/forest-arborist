import * as process from "process";
// Mine
import * as core from "./core";

export interface ForOptions {
  keepgoing?: boolean;
}

export interface ForParallelOptions {
  jobs: number;
}

export function doFor(
  cmd: string,
  args: string[],
  options: ForOptions,
  filter: (entry: core.DependencyEntry) => boolean,
): void {
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
    const options = { cwd: repo.repoPath, outputConfig: helper };
    await helper.execCommand(cmd, args, options);
  };
  core.processRepos(targetRepos, processRepo);

  //   try {
  //     util.execCommandSync(cmd, args, { cwd: repoPath });
  //   } catch (err) {
  //     if (options.keepgoing) {
  //       console.log(""); // blank line after command output
  //     } else {
  //       // Check whether the command was a typo before suggesting the --keepgoing option
  //       // `execFileSync` fails with "ENOENT" when the command being run doesn't exist
  //       const peekErr = err as { code?: string };
  //       if (peekErr.code !== "ENOENT") {
  //         console.log(
  //           '(to keep going despite errors you can use "--keepgoing")',
  //         );
  //       }
  //       throw err;
  //     }
  //   }
  // });

  process.chdir(startDir); // Simplify unit tests and reuse
}

export function doForEach(
  cmd: string,
  args: string[],
  options: ForOptions,
): void {
  doFor(cmd, args, options, () => {
    return true;
  });
}

export function doForFree(
  cmd: string,
  args: string[],
  options: ForOptions,
): void {
  doFor(cmd, args, options, (entry) => {
    return entry.lockBranch === undefined && entry.pinRevision === undefined;
  });
}

export function doForGit(args: string[], options: ForOptions): void {
  doFor("git", args, options, (entry) => {
    return entry.repoType === "git";
  });
}

export function doForHg(args: string[], options: ForOptions): void {
  doFor("hg", args, options, (entry) => {
    return entry.repoType === "hg";
  });
}
