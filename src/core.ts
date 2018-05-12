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

  let tryParent = true;
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
  mainPath?: string;
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
  if (options.mainPath !== undefined) {
    manifest = path.join(options.mainPath, manifest);
  }

  return manifest;
}


export function manifestList(mainPath: string): number | undefined  {
  const manifestDir = path.join(mainPath, ".fab");
  if (!fs.existsSync(manifestDir)) {
    console.log("(No manifest folder found. Do you need to cd to main repo, or run \"fab init\"?)");
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
  mainPath: string;
  manifest?: string;
}


export function readRootFile(): RootFile {
  // Use absolute path so appears in any errors
  const fabRootPath = path.resolve(fabRootFilename);
  const rootObject = util.readJson(fabRootPath, ["mainPath"]);
  // rootObject may also have manifest property.

  // Santise inputs: normalise mainPath
  rootObject.mainPath = util.normalizeToPosix(rootObject.mainPath);

  return rootObject;
}


export interface WriteRootFileOptions {
  rootFilePath: string;
  mainPath: string;
  manifest?: string;
  tipToAddToIgnore?: boolean;
}


export function writeRootFile(options: WriteRootFileOptions) {
  let initialisedWord = "Initialised";
  if (fs.existsSync(options.rootFilePath))
    initialisedWord = "Reinitialised";
  const rootObject = {
    mainPath: util.normalizeToPosix(options.mainPath),
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
  addMainToDependencies?: boolean;
  mainPath?: string;
  manifest?: string;
}

export interface Manifest {
  dependencies: Dependencies;
  rootDirectory: string;
  mainPathFromRoot: string;
  tipsForManualEditing?: string[];
}

export function readManifest(options: ReadManifestOptions): Manifest {
  // Sort out manifest location
  let mainPath: string | undefined;
  let manifest;
  if (options.fromRoot) {
    const rootObject = readRootFile();
    mainPath = rootObject.mainPath;
    manifest = rootObject.manifest;
  } else {
    mainPath = options.mainPath;
    manifest = options.manifest;
  }
  if (mainPath === undefined) {
    mainPath = ".";
  }
  const fabManifest = manifestPath({ mainPath, manifest });

  // Display some clues if file not foung
  if (!fs.existsSync(fabManifest)) {
    manifestList(mainPath);
    if (manifest !== undefined) {
      util.terminate(`manifest not found: ${manifest}`);
    } else {
      util.terminate("default manifest not found");
    }
  }

  // Hurrah, read manifest
  const manifestObject = util.readJson(
    fabManifest,
    ["dependencies", "rootDirectory", "mainPathFromRoot"]
  );

  // Cleanup as may have been edited or old versions.
  manifestObject.rootDirectory = util.normalizeToPosix(manifestObject.rootDirectory);
  manifestObject.mainPathFromRoot = util.normalizeToPosix(manifestObject.mainPathFromRoot);

  const mainRepoType = repo.getRepoTypeForLocalPath(mainPath);
  const mainOrigin = repo.getOrigin(mainPath, mainRepoType);
  const parsedMainOrigin = dvcsUrl.parse(mainOrigin);
  if (options.addMainToDependencies) {
    manifestObject.dependencies[manifestObject.mainPathFromRoot] = { origin: mainOrigin, repoType: mainRepoType };
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
    if (dvcsUrl.isRelativePath(entry.origin)) {
      entry.origin = dvcsUrl.resolve(parsedMainOrigin, entry.origin);
    }
  });

  return manifestObject;
}
