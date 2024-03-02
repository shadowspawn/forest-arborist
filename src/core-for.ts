import * as process from 'process';
// Mine
import * as core from "./core";
import * as util from "./util";


export interface ForOptions {
  keepgoing?: boolean;
}

export interface ForParallelOptions {
  jobs: number;
}

export function doFor(cmd: string, args: string[], options: ForOptions, filter: (entry: core.DependencyEntry) => boolean): void {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const forestRepos = core.readManifest(
    { fromRoot: true, addSeedToDependencies: true }
  ).dependencies;

  Object.keys(forestRepos).forEach((repoPath) => {
    if (!filter(forestRepos[repoPath])) {
      return; // continue forEach
    }

    try {
      util.execCommandSync(
        cmd, args, { cwd: repoPath }
      );
    } catch (err) {
      if (options.keepgoing) {
        console.log(""); // blank line after command output
      } else {
        // Check whether the command was a typo before suggesting the --keepgoing option
        // `execFileSync` fails with "ENOENT" when the command being run doesn't exist
        const peekErr = err as { code?: string };
        if (peekErr.code !== "ENOENT") {
          console.log('(to keep going despite errors you can use "--keepgoing")');
        }
        throw err;
      }
    }
  });
  process.chdir(startDir); // Simplify unit tests and reuse
}


export async function doForParallel(cmd: string, args: string[], options: ForParallelOptions, filter: (entry: core.DependencyEntry) => boolean): Promise<void> {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const forestRepos = core.readManifest(
    { fromRoot: true, addSeedToDependencies: true }
  ).dependencies;
  const commands: util.CommandDetail[] = [];

  Object.keys(forestRepos).forEach((repoPath) => {
    if (!filter(forestRepos[repoPath])) {
      return; // continue forEach
    }

    commands.push(util.prepareCommand(
      cmd, args, { cwd: repoPath }
    ));
  });
  await util.throttleActions(commands, options.jobs);

  process.chdir(startDir); // Simplify unit tests and reuse
}


export function doForEach(cmd: string, args: string[], options: ForOptions): void {
  doFor(cmd, args, options, () => {
    return true;
  });
}


export function doForFree(cmd: string, args: string[], options: ForOptions): void {
  doFor(cmd, args, options, (entry) => {
    return (entry.lockBranch === undefined && entry.pinRevision === undefined);
  });
}


export function doForGit(args: string[], options: ForOptions): void {
  doFor("git", args, options, (entry) => {
    return (entry.repoType === "git");
  });
}


export function doForGitParallel(args: string[], options: ForParallelOptions): void {
  doForParallel("git", args, options, (entry) => {
    return (entry.repoType === "git");
  });
}


export function doForHg(args: string[], options: ForOptions): void {
  doFor("hg", args, options, (entry) => {
    return (entry.repoType === "hg");
  });
}

