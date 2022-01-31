import * as childProcess from "child_process";
import * as fs from "fs";
import * as fsX from "fs-extra";
import * as path from "path";
import * as process from 'process';
// Mine
import * as core from "./core";
import * as dvcsUrl from "./dvcs-url";
import * as repo from "./repo";
import * as util from "./util";


interface FindRepositoriesCallback { (repoPath: string, repoType: repo.RepoType): void }


function findRepositories(startingDirectory: string, callback: FindRepositoriesCallback) {
  if (startingDirectory === ".hg" || startingDirectory === ".git") {
    return; // No point searching inside control folders
  }

  const itemList = fs.readdirSync(startingDirectory);
  itemList.forEach((item) => {
    const itemPath = path.join(startingDirectory, item);
    if (fs.statSync(itemPath).isDirectory()) {
      if (fs.existsSync(path.join(itemPath, ".git"))) {
        callback(itemPath, "git");
      } else if (fs.existsSync(path.join(itemPath, ".hg"))) {
        callback(itemPath, "hg");
      }

      // Keep searching in case of nested repos.
      findRepositories(itemPath, callback);
    }
  });
}


function isHgPinned(repoPath: string) {
  const behindCount = childProcess.execFileSync(
    "hg", ["--repository", repoPath, "log", "-r", "children(.) and branch(.)", "--template", "x"]
  ).length;
  return behindCount > 0;
}


interface MakeDependencyEntryWithDetailsOptions {
  repoPath: string;
  repoType: repo.RepoType;
  seedBranch: string | undefined;
  parsedSeedOrigin: dvcsUrl.DvcsUrl;
}

function makeDependencyEntryWithDetails(options: MakeDependencyEntryWithDetailsOptions): core.DependencyEntry {
  const repoPath = options.repoPath;
  const repoType = repo.getRepoTypeForParams(options.repoPath, options.repoType);
  const parsedSeedOrigin = options.parsedSeedOrigin;
  const origin = repo.getOrigin(repoPath, repoType);

  console.log(`  ${repoPath}`);
  const entry: core.DependencyEntry = { origin, repoType };
  if (origin === undefined) {
    console.log(util.errorColour("    (origin not specified)"));
  }

  // Pinned, then free, and fallback to locked.
  const lockBranch = repo.getBranch(repoPath, repoType);
  if (repoType == "git" && lockBranch === undefined) {
    // likely git detached head
    entry.pinRevision = repo.getRevision(repoPath, repoType);
    console.log(`    (pinned revision to ${entry.pinRevision})`);
  } else if (repoType === "hg" && isHgPinned(repoPath)) {
    entry.pinRevision = repo.getRevision(repoPath, repoType);
    console.log(`    (pinned revision to ${entry.pinRevision})`);
  } else if (lockBranch !== options.seedBranch) {
    console.log(`    (locked branch to ${lockBranch})`);
    entry.lockBranch = lockBranch;
  } else {
    // Fairly conservative about choosing free.
    let locked = true;
    if (origin !== undefined && parsedSeedOrigin
   !== undefined) {
      const parsedOrigin = dvcsUrl.parse(origin);
      if (dvcsUrl.sameDir(parsedOrigin, parsedSeedOrigin)) {
        locked = false;
        console.log("    (free)");
        const relativePath = dvcsUrl.relative(parsedSeedOrigin, parsedOrigin);
        // Should always be true?
        if (dvcsUrl.isRelativePath(relativePath)) {
          entry.origin = relativePath;
        }
      }
    }
    if (locked) {
      console.log(`    (locked branch to ${lockBranch})`);
      entry.lockBranch = lockBranch;
    }
  }

  return entry;
}


export interface MakeDependencyEntryOptions {
  repoPath: string;
  seedRepoPath: string;
}

export function makeDependencyEntry(options: MakeDependencyEntryOptions): core.DependencyEntry {
  const repoPath = options.repoPath;
  const repoType = repo.getRepoTypeForLocalPath(repoPath);
  const seedBranch = repo.getBranch(options.seedRepoPath);
  const parsedSeedOrigin = dvcsUrl.parse(repo.getOrigin(options.seedRepoPath));
  return makeDependencyEntryWithDetails({ repoPath, repoType, seedBranch, parsedSeedOrigin});
}


export interface InitOptions {
  manifest?: string;
  root: string;
}

export function doInit(options: InitOptions): void {
  const startDir = process.cwd();

  const relManifestPath = core.manifestPath({ manifest: options.manifest });
  if (fs.existsSync(relManifestPath)) {
    console.log(util.errorColour(`Skipping init, already have ${relManifestPath}`));
    console.log("(Delete it to start over, or did you want \"fab install\"?)");
    return util.terminate();
  }
  const absManifestPath = path.resolve(startDir, relManifestPath);

  // Find seed origin, if we can.
  const seedRepoType = repo.getRepoTypeForLocalPath(".");
  const seedOrigin = repo.getOrigin(".", seedRepoType);
  const seedBranch = repo.getBranch(".", seedRepoType);
  let parsedSeedOrigin: dvcsUrl.DvcsUrl;
  if (seedOrigin === undefined) {
    console.log(util.errorColour("(origin not specified for starting repo)"));
  } else {
    parsedSeedOrigin
 = dvcsUrl.parse(seedOrigin);
  }

  // Sort out seed and root paths
  const mainAbsolutePath = process.cwd();
  let rootAbsolutePath;
  if (options.root === undefined) {
    rootAbsolutePath = process.cwd();
    console.log("Scanning for nested dependencies…");
  } else {
    rootAbsolutePath = path.resolve(mainAbsolutePath, options.root);
    console.log("Scanning for dependencies from root…");
  }
  const mainFromRoot = path.relative(rootAbsolutePath, mainAbsolutePath);
  const rootFromMain = path.relative(mainAbsolutePath, rootAbsolutePath);

  // Dependencies (implicitly finds seed too, but that gets deleted)
  process.chdir(rootAbsolutePath);
  const dependencies: core.Dependencies = {};
  findRepositories(".", (repoPath, repoType) => {
    const entry = makeDependencyEntryWithDetails({ repoPath, repoType, seedBranch, parsedSeedOrigin});
    dependencies[util.normalizeToPosix(repoPath)] = entry;
  });
  delete dependencies[mainFromRoot];

  const manifest: core.Manifest = {
    dependencies,
    rootDirectory: util.normalizeToPosix(rootFromMain),
    seedPathFromRoot: util.normalizeToPosix(mainFromRoot),
  };

  const manifestDir = path.dirname(absManifestPath);
  fsX.ensureDirSync(manifestDir);
  // fsX.writeJsonSync(absManifestPath, manifest, { spaces: 2 });
  core.writeManifest(absManifestPath, manifest);

  console.log(`Initialised dependencies in ${relManifestPath}`);

  // Root placeholder file. Safe to overwrite as low content.
  core.writeRootFile({
    rootFilePath: path.join(rootAbsolutePath, core.fabRootFilename),
    seedPath: mainFromRoot,
    manifest: options.manifest,
    tipToAddToIgnore: true,
  });

  // Offer clue for possible sibling init situation.
  if (Object.keys(dependencies).length === 0) {
    console.log("(No dependencies found. For a sibling repo layout use \"fab init --root ..\")");
  }
  process.chdir(startDir); // Simplify unit tests and reuse
}
