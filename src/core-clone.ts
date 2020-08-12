import * as fs from "fs";
import * as fsX from "fs-extra";
import * as path from "path";
import * as tmp from "tmp";
// Mine
import * as core from "./core";
import * as dvcsUrl from "./dvcs-url";
import * as repo from "./repo";
import * as util from "./util";


export function cloneEntry(entry: core.DependencyEntry, repoPath: string, freeBranch?: string): void {
  // Mercurial does not support making intermediate folders.
  if (entry.repoType === "hg") {
    const parentDir = path.dirname(repoPath);
    fsX.ensureDirSync(parentDir);
  }

  // Determine target branch for clone
  let branch;
  if (entry.pinRevision !== undefined) {
    console.log(`# ${repoPath}: cloning pinned revision`);
    branch = undefined;
  } else if (entry.lockBranch !== undefined) {
    console.log(`# ${repoPath}: cloning locked branch`);
    branch = entry.lockBranch;
  } else if (freeBranch !== undefined) {
    console.log(`# ${repoPath}: cloning free repo on requested branch`);
    branch = freeBranch;
  } else {
    console.log(`# ${repoPath}: cloning free repo`);
  }

  const args = ["clone"];
  if (branch !== undefined) {
    if (entry.repoType === "git") {
      args.push("--branch", branch);
    } if (entry.repoType === "hg") {
      args.push("--updaterev", branch);
    }
  }

  // Suppress checkout for pinRevision
  if (entry.pinRevision !== undefined) {
    if (entry.repoType === "git") {
      args.push("--no-checkout");
    } if (entry.repoType === "hg") {
      args.push("--noupdate");
    }
  }
  args.push(util.getStringOrThrow(entry.origin, "origin undefined"), repoPath);
  // Clone command ready!
  util.execCommandSync(entry.repoType, args, { suppressContext: true });

  // Second command to checkout pinned revision
  if (entry.pinRevision !== undefined) {
    if (entry.repoType === "git") {
      util.execCommandSync(
        "git", ["checkout", "--quiet", entry.pinRevision], { cwd: repoPath }
      );
    } else if (entry.repoType === "hg") {
      util.execCommandSync(
        "hg", ["update", "--rev", entry.pinRevision], { cwd: repoPath }
      );
    }
  }
}

function refreshEntry(entry: core.DependencyEntry, repoPath: string, freeBranch?: string): void {
  // Refresh repo in case we have stale state. Reasonable during an install, which will clone repos if missing.
  // Could do more work to check if target already present, or restrict what is requested, but KISS.
  if (entry.pinRevision !== undefined
    || entry.lockBranch !== undefined
    || freeBranch !== undefined) {
    if (entry.repoType === "git") {
      util.execCommandSync("git", ["fetch"], { cwd: repoPath });
    } else if (entry.repoType === "hg") {
      util.execCommandSync("hg", ["pull"], { cwd: repoPath });
    }
  }
}

export function checkoutEntry(entry: core.DependencyEntry, repoPath: string, freeBranch?: string): void {
  // Determine target for checkout
  let revision;
  let gitConfig: string[] = [];
  let displayName = repoPath;
  if (displayName === "" || displayName === ".")
    displayName = "(root)";
  if (entry.pinRevision !== undefined) {
    console.log(`# ${displayName}: checkout pinned revision`);
    revision = entry.pinRevision;
    gitConfig = ["-c", "advice.detachedHead=false"];
  } else if (entry.lockBranch !== undefined) {
    console.log(`# ${displayName}: checkout locked branch`);
    revision = entry.lockBranch;
  } else if (freeBranch !== undefined) {
    console.log(`# ${displayName}: checkout free repo on requested branch`);
    revision = freeBranch;
  } else {
    console.log(`# ${displayName}: skipping free repo`);
  }

  if (revision !== undefined) {
    if (entry.repoType === "git") {
      util.execCommandSync(
        "git", gitConfig.concat(["checkout", revision]), { cwd: repoPath }
      );
    } else if (entry.repoType === "hg") {
      util.execCommandSync(
        "hg", ["update", "--rev", revision], { cwd: repoPath }
      );
    }
  } else {
    console.log("");
  }
}


export interface InstallOptions {
  manifest?: string;
}


export function doInstall(options: InstallOptions): void {
  const startDir = process.cwd();
  // Use same branch as seed for free branches
  const manifestObject = core.readManifest({
    seedPath: ".",
    manifest: options.manifest,
  });
  const rootAbsolutePath = path.resolve(startDir, manifestObject.rootDirectory);
  const seedFromRoot = path.relative(rootAbsolutePath, process.cwd());
  const freeBranch = repo.getBranch(".");
  core.writeRootFile({
    rootFilePath: path.join(rootAbsolutePath, core.fabRootFilename),
    seedPath: seedFromRoot,
    manifest: options.manifest,
  });
  console.log();

  core.cdRootDirectory();
  const dependencies = manifestObject.dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    const entry = dependencies[repoPath];
    if (fs.existsSync(repoPath)) {
      refreshEntry(entry, repoPath, freeBranch);
      checkoutEntry(entry, repoPath, freeBranch);
    } else {
      cloneEntry(entry, repoPath, freeBranch);
    }
  });
  process.chdir(startDir);
}


export interface CloneOptions {
  manifest?: string;
  branch?: string;
}


// Returns path to new root, as it the destination is not specified it is affected by nested/sibling.

export function doClone(source: string, destinationParam?: string, optionsParam?: CloneOptions): string {
  let options: CloneOptions = {};
  if (optionsParam !== undefined) {
    options = optionsParam;
  }
  const startDir = process.cwd();
  // We need the name for the newly created directory to find the manifest file after the clone.
  let destination = destinationParam;
  if (destination === undefined) {
    destination = dvcsUrl.repoName(dvcsUrl.parse(source));
  }
  let rootDestination = destination;

  // Clone source.
  let repoType: repo.RepoType = "git";
  if (repo.isGitRepository(source)) {
    repoType = "git";
  } else if (repo.isHgRepository(source)) {
    repoType = "hg";
  } else {
    console.log("(Does the source repo exist?)");
    util.terminate(`failed to find repository type for ${source}`);
  }
  const seedEntry: core.DependencyEntry = { origin: source, repoType };
  cloneEntry(seedEntry, destination, options.branch);

  const fabManifest = core.manifestPath({ seedPath: destination });
  if (!fs.existsSync(fabManifest)) {
    util.terminate(`stopping as did not find manifest ${fabManifest}`);
  }

  // Look in manifest and sort out nested vs sibling layout.
  const manifest = core.readManifest({
    seedPath: destination,
    manifest: options.manifest,
  });
  if (manifest.seedPathFromRoot !== ".") {
    console.log("Using sibling repo layout");
    // Play shell game for sibling layout to get seed in to destination root folder.
    // Easy to get confused!
    // Support destination including some path, like path/to/new-root.
    const destinationParentDir = path.dirname(destination);
    // Make a temporary directory
    const tmpObj = tmp.dirSync({ dir: destinationParentDir, keep: true });
    // Move the seed repo into the temporary directory, getting it out of the way
    // so we can make root with the destination name.
    const shelfRepoPath = path.join(tmpObj.name, "seed");
    fs.renameSync(destination, shelfRepoPath);
    // Make the wrapper root folder. Should we add name decoration if not specified, like foo-forest?
    if (destinationParam === undefined) {
      rootDestination = rootDestination.concat("-forest");
    }
    fs.mkdirSync(rootDestination);
    // Move seed into root with manifest supplied name
    const seedPathFromHere = path.join(rootDestination, manifest.seedPathFromRoot);
    fs.renameSync(shelfRepoPath, seedPathFromHere);
    tmpObj.removeCallback();
    process.chdir(seedPathFromHere);
  } else {
    process.chdir(destination);
  }

  doInstall({ manifest: options.manifest });

  console.log(`Created repo forest in root ${rootDestination}`);
  process.chdir(startDir);
  return rootDestination;
}
