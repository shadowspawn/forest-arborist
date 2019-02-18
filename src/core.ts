// These are the routines which implement the command line

import * as childProcess from "child_process";
import * as fs from "fs";
import * as fsX from "fs-extra";
import * as path from "path";
// Mine
import * as dvcsUrl from "./dvcs-url";
import * as repo from "./repo";
import * as util from "./util";


export interface DependencyEntry {
  repoType: repo.RepoType;
  origin?: string;
  pinRevision?: string;
  lockBranch?: string;
}

export interface Dependencies {
  [repoPath: string]: DependencyEntry;
}



export const fabRootFilename: string = ".fab-root.json"; // stored in root directory


export function cdRootDirectory(): void {
  const startDir = process.cwd();
  const startedInMainDirectory = fs.existsSync(".fab");

  let tryParent;
  do {
    if (fs.existsSync(fabRootFilename)) {
      return;
    }

    // NB: chdir("..") from "/" silently does nothing on Mac, so check we moved
    const cwd = process.cwd();
    process.chdir("..");
    tryParent = (cwd !== process.cwd());
  } while (tryParent);

  // Failed to find root
  process.chdir(startDir);
  if (startedInMainDirectory) {
    util.terminate("root of forest not found. (Do you need to call \"fab install\"?)");
  } else {
    util.terminate("root of forest not found. ");
  }
}


export interface ManifestOptions {
  manifest?: string;
  seedPath?: string;
}


// Perhaps make internal when finished refactor?
export function manifestPath(options: ManifestOptions): string {
  let manifest;
  // filename
  if (options.manifest !== undefined) {
    manifest = `${options.manifest}_manifest.json`;
  } else {
    manifest = "manifest.json";
  }
  // directory
  manifest = `.fab/${manifest}`;
  // path
  if (options.seedPath !== undefined) {
    manifest = path.join(options.seedPath, manifest);
  }

  return manifest;
}


export function manifestList(seedPath: string): number | undefined  {
  const manifestDir = path.join(seedPath, ".fab");
  if (!fs.existsSync(manifestDir)) {
    console.log("(No manifest folder found. Do you need to cd to seed repo, or run \"fab init\"?)");
    return undefined;
  }

  console.log("Available manifest:");
  const itemList = fs.readdirSync(manifestDir);
  let count = 0;
  itemList.forEach((item) => {
    if (item === "manifest.json") {
      console.log("  (default)");
      count += 1;
    } else {
      const match = /(.*)_manifest.json$/.exec(item);
      if (match !== null) {
        count += 1;
        console.log(`  ${match[1]}`);
      }
    }
  });
  if (count === 0) console.log("  (none found)");
  return count; // Used in tests, not in client code.
}


export interface RootFile {
  seedPath: string;
  manifest?: string;
}


export function readRootFile(): RootFile {
  // Use absolute path so appears in any errors
  const fabRootPath = path.resolve(process.cwd(), fabRootFilename);
  const rootObjectOnDisk = util.readJson(fabRootPath);
  // mainPath: fab v1 and v2
  // seedPath: fab v3
  if (rootObjectOnDisk.seedPath === undefined) {
    rootObjectOnDisk.seedPath = rootObjectOnDisk.mainPath;
  }
  if (rootObjectOnDisk.seedPath === undefined) {
    util.terminate(`problem parsing: ${fabRootPath}\nMissing property 'seedPath'`);
  }

  const rootObject: RootFile = {
    seedPath: rootObjectOnDisk.seedPath,
    manifest: rootObjectOnDisk.manifest,
  };

  // Santise inputs: normalise mainPath
  rootObject.seedPath = util.normalizeToPosix(rootObject.seedPath);

  return rootObject;
}


export interface WriteRootFileOptions {
  rootFilePath: string;
  seedPath: string;
  manifest?: string;
  tipToAddToIgnore?: boolean;
}


export function writeRootFile(options: WriteRootFileOptions) {
  let initialisedWord = "Initialised";
  if (fs.existsSync(options.rootFilePath))
    initialisedWord = "Reinitialised";
  const rootObject = {
    seedPath: util.normalizeToPosix(options.seedPath),
    manifest: options.manifest,
  };
  fsX.writeJsonSync(options.rootFilePath, rootObject, { spaces: 2 });

  console.log(`${initialisedWord} marker file at root of forest: ${fabRootFilename}`);

  if (options.tipToAddToIgnore) {
    const rootDir = path.dirname(options.rootFilePath);
    if (repo.isGitRepository(rootDir)) {
      try {
        childProcess.execFileSync("git", ["check-ignore", "--quiet", fabRootFilename]);
      } catch (err) {
        if (err.status === 1) {
          console.log(`(Suggest you add ${fabRootFilename} to .gitignore)`);
        }
      }
    }
  }
}


export interface ReadManifestOptions {
  fromRoot?: boolean;
  addSeedToDependencies?: boolean;
  seedPath?: string;
  manifest?: string;
}

export interface Manifest {
  dependencies: Dependencies;
  rootDirectory: string;
  seedPathFromRoot: string;
}

interface ManifestOnDisk {
  dependencies: Dependencies;
  rootDirectory: string;
  mainPathFromRoot: string;  // Old deprecated name
  seedPathFromRoot?: string; // New name
  tipsForManualEditing?: string[];
}

export function readManifest(options: ReadManifestOptions): Manifest {
  // Sort out manifest location
  let seedPath: string | undefined;
  let manifest;
  if (options.fromRoot) {
    const rootObject = readRootFile();
    seedPath = rootObject.seedPath;
    manifest = rootObject.manifest;
  } else {
    seedPath = options.seedPath;
    manifest = options.manifest;
  }
  if (seedPath === undefined) {
    seedPath = ".";
  }
  const fabManifest = manifestPath({ seedPath, manifest });

  // Display some clues if file not foung
  if (!fs.existsSync(fabManifest)) {
    manifestList(seedPath);
    if (manifest !== undefined) {
      util.terminate(`manifest not found: ${manifest}`);
    } else {
      util.terminate("default manifest not found");
    }
  }

  // Hurrah, read manifest
  // mainPathFromRoot is deprecated, but still must be present to support older versions of fab.
  const manifestObjectFromDisk: ManifestOnDisk = util.readJson(
    fabManifest,
    ["dependencies", "rootDirectory", "mainPathFromRoot"]
  );
  if (manifestObjectFromDisk.seedPathFromRoot === undefined) {
    // File written by older version.
    manifestObjectFromDisk.seedPathFromRoot = manifestObjectFromDisk.mainPathFromRoot;
  }

  // Cleanup as may have been edited or set poorly in old versions.
  manifestObjectFromDisk.rootDirectory = util.normalizeToPosix(manifestObjectFromDisk.rootDirectory);
  manifestObjectFromDisk.seedPathFromRoot = util.normalizeToPosix(manifestObjectFromDisk.seedPathFromRoot);

  const manifestObject: Manifest = {
    dependencies: manifestObjectFromDisk.dependencies,
    rootDirectory: manifestObjectFromDisk.rootDirectory,
    seedPathFromRoot: manifestObjectFromDisk.seedPathFromRoot,
  };

  const seedRepoType = repo.getRepoTypeForLocalPath(seedPath);
  const seedOrigin = repo.getOrigin(seedPath, seedRepoType);
  const parsedSeedOrigin = dvcsUrl.parse(seedOrigin);
  if (options.addSeedToDependencies) {
    manifestObject.dependencies[manifestObject.seedPathFromRoot] = { origin: seedOrigin, repoType: seedRepoType };
  }

  Object.keys(manifestObject.dependencies).forEach((repoPath) => {
    // Sanity check repoType so callers do not need to warn about unexpected type.
    const entry = manifestObject.dependencies[repoPath];
    const supportedTypes = ["git", "hg"];
    if (supportedTypes.indexOf(entry.repoType) === -1) {
      console.log(util.errorColour(
        `Skipping entry for "${repoPath}" with unsupported repoType: ${entry.repoType}`
      ));
      delete manifestObject.dependencies[repoPath];
      return; // continue forEach
    }

    // Turn relative repos into absolute repos.
    if (entry.origin !== undefined && dvcsUrl.isRelativePath(entry.origin)) {
      entry.origin = dvcsUrl.resolve(parsedSeedOrigin, entry.origin);
    }
  });

  return manifestObject;
}


export function writeManifest(manifestPath: string, manifestObject: Manifest) {
  const manifestObjectToDisk = {
    dependencies: manifestObject.dependencies,
    rootDirectory: manifestObject.rootDirectory,
    seedPathFromRoot: manifestObject.seedPathFromRoot,
    mainPathFromRoot: manifestObject.seedPathFromRoot,
    tipsForManualEditing: [
      "The origin property for dependencies can be an URL ",
      "  or a relative path which is relative to the seed repo origin.)",
      "The key for the dependencies map is the local relative path from the root directory.",
      "Use forward slashes in paths (e.g. path/to not path\to).",
      "Dependent repos come in three flavours, determined by the properties:",
      "  1) if has pinRevision property, repo pinned to specified revision or tag (commit-ish)",
      "  2) if has lockBranch property, repo locked to specified branch",
      "  3) otherwise, repo is free and included in branch affecting commands",
      "Note: mainPathFromRoot is old name for seedPathFromRoot and deprecated.",
    ],
  };
  fsX.writeJsonSync(manifestPath, manifestObjectToDisk, { spaces: 2 });
}
