import * as fs from "fs";
import * as path from "path";
// Mine
import * as core from "./core";
import * as coreClone from "./core-clone";
import * as dvcsUrl from "./dvcs-url";
import * as repo from "./repo";
import * as util from "./util";


function doSemiInstall() {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const rootObject = core.readRootFile();
  const manifestObject = core.readManifest({ fromRoot: true, manifest: rootObject.manifest });

  const seedPath = rootObject.seedPath;
  let freeBranch = repo.getBranch(seedPath);
  if (freeBranch === undefined && repo.isGitRepository(seedPath)) {
    util.execCommandSync(
      "git", ["checkout", "@{-1}"], { cwd: seedPath }
    );
    // childProcess.execFileSync("git", ["checkout", "@{-1}"], { cwd: seedPath });
    freeBranch = repo.getBranch(seedPath);
  } else {
    const origin = repo.getOrigin(seedPath);
    const repoType = repo.getRepoTypeForLocalPath(seedPath);
    const seedEntry = { origin, repoType };
    coreClone.checkoutEntry(seedEntry, seedPath, freeBranch);
  }

  const dependencies = manifestObject.dependencies;
  Object.keys(dependencies).forEach((repoPath) => {
    const entry = dependencies[repoPath];
    if (fs.existsSync(repoPath)) {
      coreClone.checkoutEntry(entry, repoPath, freeBranch);
    }
  });

  process.chdir(startDir);
}


export interface SnapshotOptions {
  output?: string;
}


export function doSnapshot(options: SnapshotOptions) {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const rootObject = core.readRootFile();
  const manifestObject = core.readManifest({ fromRoot: true, manifest: rootObject.manifest });

  // Create dependencies with fixed revision and absolute repo.
  const dependencies: core.Dependencies = {};
  Object.keys(manifestObject.dependencies).forEach((repoPath) => {
    const entry = manifestObject.dependencies[repoPath];
    dependencies[repoPath] = {
      origin: repo.getOrigin(repoPath, entry.repoType), // KISS, want absolute
      repoType: entry.repoType,
      pinRevision: repo.getRevision(repoPath, entry.repoType),
    };
  });

  const seedPath = rootObject.seedPath;
  const seedRepoType = repo.getRepoTypeForLocalPath(seedPath);
  const seedRepo = {
    origin: repo.getOrigin(seedPath, seedRepoType),
    repoType: seedRepoType,
    pinRevision: repo.getRevision(seedPath, seedRepoType),
  };

  const snapshot = {
    dependencies,
    rootDirectory: manifestObject.rootDirectory,
    seedPathFromRoot: manifestObject.seedPathFromRoot,
    manifest: rootObject.manifest,
    seedRepo
  };

  const prettySnapshot = JSON.stringify(snapshot, null, "  ");
  if (options.output === undefined) {
    console.log(prettySnapshot);
  } else {
    fs.writeFileSync(options.output, prettySnapshot);
  }
  process.chdir(startDir);
}


function readSnapshot(snapshotPath: string) {
  const snapshotObject = util.readJson(
    snapshotPath,
    ["dependencies", "rootDirectory"]
  );

  // Used mainRepo and mainPathFromRoot in fab v1 amd v2
  if (snapshotObject.seedRepo === undefined) {
    snapshotObject.seedRepo = snapshotObject.mainRepo;
  }
  if (!Object.prototype.hasOwnProperty.call(snapshotObject, "seedRepo")) {
    util.terminate(`problem parsing: ${snapshotPath}\nMissing property 'seedRepo'`);
  }
  if (snapshotObject.seedPathFromRoot === undefined) {
    snapshotObject.seedPathFromRoot = snapshotObject.mainPathFromRoot;
  }
  if (!Object.prototype.hasOwnProperty.call(snapshotObject, "seedPathFromRoot")) {
    util.terminate(`problem parsing: ${snapshotPath}\nMissing property 'seedPathFromRoot'`);
  }

  return snapshotObject;
}


export function doRecreate(snapshotPath: string, destinationParam?: string) {
  const startDir = process.cwd();
  const snapshotObject = readSnapshot(snapshotPath);
  const seedRepoEntry = snapshotObject.seedRepo;

  let destination = destinationParam;
  if (destination === undefined || destination === "") {
    destination = dvcsUrl.repoName(dvcsUrl.parse(seedRepoEntry.origin));
  }

  // Clone seed repo first and cd to root
  const seedPathFromRoot = util.normalizeToPosix(snapshotObject.seedPathFromRoot);
  if (seedPathFromRoot !== ".") {
    // Sibling layout. Make wrapper root directory.
    fs.mkdirSync(destination);
    process.chdir(destination);
    destination = seedPathFromRoot;
    coreClone.cloneEntry(seedRepoEntry, destination);
  } else {
    coreClone.cloneEntry(seedRepoEntry, destination);
    process.chdir(destination);
  }

  // Clone dependent repos.
  const dependencies = snapshotObject.dependencies;
  Object.keys(dependencies).forEach((repoPath) => {
    const entry = dependencies[repoPath];
    coreClone.cloneEntry(entry, repoPath);
  });

  // Install root file
  core.writeRootFile({
    rootFilePath: path.resolve(process.cwd(), core.fabRootFilename),
    seedPath: snapshotObject.seedPathFromRoot,
    manifest: snapshotObject.manifest,
  });

  console.log(`Recreated repo forest from snapshot to ${destination}`);
  console.log("(use \"fab restore\" without snapshot file to get a current checkout again)");
  process.chdir(startDir);
}


export function doRestore(snapshotPath?: string) {
  if (snapshotPath !== undefined && !fs.existsSync(snapshotPath)) {
    util.terminate(`snapshot file not found "${snapshotPath}"`);
  }

  if (snapshotPath === undefined) {
    doSemiInstall();
    return;
  }

  const startDir = process.cwd();
  const snapshotObject = readSnapshot(snapshotPath);
  core.cdRootDirectory();

  coreClone.checkoutEntry(snapshotObject.seedRepo, snapshotObject.seedPathFromRoot);

  const dependencies = snapshotObject.dependencies;
  Object.keys(dependencies).forEach((repoPath) => {
    const entry = dependencies[repoPath];
    if (fs.existsSync(repoPath)) {
      coreClone.checkoutEntry(entry, repoPath);
    } else {
      coreClone.cloneEntry(entry, repoPath);
    }
  });

  console.log("Restored repo forest from snapshot");
  console.log("(use \"fab restore\" without snapshot file to get a current checkout again)");
  process.chdir(startDir);
}
