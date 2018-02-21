import fs = require("fs");
import path = require("path");
import tmp = require("tmp");
// Mine
import core = require("./core");
import dvcsUrl = require("./dvcs-url");
import fsX = require("./fsExtra");
import repo = require("./repo");
import util = require("./util");


export function cloneEntry(entry: core.DependencyEntry, repoPath: string, freeBranch?: string) {
  // Mercurial does not support making intermediate folders.
  // This just copes with one deep, but KISS and cover most use.
  if (entry.repoType === "hg") {
    const parentDir = path.dirname(repoPath);
    if (parentDir !== "." && !fsX.dirExistsSync(parentDir)) {
      fs.mkdirSync(parentDir);
    }
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
  if (entry.origin === undefined) util.terminate("origin undefined");
  args.push(entry.origin!, repoPath);
  // Clone command ready!
  util.execCommandSync({ cmd: entry.repoType, args, suppressContext: true });

  // Second command to checkout pinned revision
  if (entry.pinRevision !== undefined) {
    if (entry.repoType === "git") {
      util.execCommandSync(
        { cmd: "git", args: ["checkout", "--quiet", entry.pinRevision], cwd: repoPath }
      );
    } else if (entry.repoType === "hg") {
      util.execCommandSync(
        { cmd: "hg", args: ["update", "--rev", entry.pinRevision], cwd: repoPath }
      );
    }
  }
}


export function checkoutEntry(entry: core.DependencyEntry, repoPath: string, freeBranch?: string) {
  // Determine target for checkout
  let revision;
  let gitConfig: string[] = [];
  let displayName = repoPath;
  if (displayName === "" || displayName === ".") displayName = "(root)";
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
        { cmd: "git", args: gitConfig.concat(["checkout", revision]), cwd: repoPath }
      );
    } else if (entry.repoType === "hg") {
      util.execCommandSync(
        { cmd: "hg", args: ["update", "--rev", revision], cwd: repoPath }
      );
    }
  } else {
    console.log("");
  }
}


export interface InstallOptions {
  manifest?: string;
}


export function doInstall(options: InstallOptions) {
  const startDir = process.cwd();
  // Use same branch as main for free branches
  const manifestObject = core.readManifest({
    mainPath: ".",
    manifest: options.manifest,
  });
  const rootAbsolutePath = path.resolve(startDir, manifestObject.rootDirectory);
  const mainFromRoot = path.relative(rootAbsolutePath, process.cwd());
  const freeBranch = repo.getBranch(".");
  core.writeRootFile({
    rootFilePath: path.join(rootAbsolutePath, core.fabRootFilename),
    mainPath: mainFromRoot,
    manifest: options.manifest,
  });
  console.log();

  core.cdRootDirectory();
  const dependencies = manifestObject.dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    const entry = dependencies[repoPath];
    if (fsX.dirExistsSync(repoPath)) {
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


export function doClone(source: string, destinationParam?: string, optionsParam?: CloneOptions) {
  let options: CloneOptions = {};
  if (optionsParam !== undefined) {
    options = optionsParam;
  }
  const startDir = process.cwd();
  // We need to know the main directory to find the manifest file after the clone.
  let destination = destinationParam;
  if (destination === undefined) {
    destination = dvcsUrl.repoName(dvcsUrl.parse(source));
  }

  // Clone source.
  let repoType: string;
  if (repo.isGitRepository(source)) {
    repoType = "git";
  } else if (repo.isHgRepository(source)) {
    repoType = "hg";
  } else {
    repoType = ""; // lint
    console.log("(Does the source repo exist?)");
    util.terminate(`failed to find repository type for ${source}`);
  }
  const mainEntry: core.DependencyEntry = { origin: source, repoType };
  cloneEntry(mainEntry, destination, options.branch);

  const fabManifest = core.manifestPath({ mainPath: destination });
  if (!fsX.fileExistsSync(fabManifest)) {
    util.terminate(`stopping as did not find manifest ${fabManifest}`);
  }

  const manifest = core.readManifest({
    mainPath: destination,
    manifest: options.manifest,
  });
  if (manifest.mainPathFromRoot !== ".") {

    // Play shell game for sibling layout, using destination as a wrapper folder.
    // Support destination including some path.
    // Easy to get confused!
    console.log("Using sibling repo layout");
    const destinationName = path.basename(destination);
    const destinationParentDir = path.dirname(destination);
    // Make a temporary directory
    const tmpObj = tmp.dirSync({ dir: destinationParentDir });
    // Move the repo into the temporary directory
    const shelfRepoPath = path.join(tmpObj.name, destinationName);
    fs.renameSync(destination, shelfRepoPath);
    // Make the wrapper folder
    fs.mkdirSync(destination);
    // Move the repo into wrapper with manifest supplied name
    const mainPathFromHere = path.join(destination, manifest.mainPathFromRoot);
    fs.renameSync(shelfRepoPath, mainPathFromHere);
    fs.rmdirSync(tmpObj.name); // Should be auto-deleted but something breaking that?
    process.chdir(mainPathFromHere);
  } else {
    process.chdir(destination);
  }

  doInstall({ manifest: options.manifest });

  console.log(`Created repo forest in ${destination}`);
  process.chdir(startDir);
}
