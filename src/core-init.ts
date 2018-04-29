import * as fs from "fs";
import * as fsX from "fs-extra";
import * as path from "path";
// Mine
import * as core from "./core";
import * as dvcsUrl from "./dvcs-url";
import * as repo from "./repo";
import * as util from "./util";


interface FindRepositoriesCallback { (repoPath: string, repoType: repo.RepoType): void; }


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


interface MakeDependencyEntryWithDetailsOptions {
  repoPath: string;
  repoType: repo.RepoType;
  mainBranch: string | undefined;
  parsedMainOrigin: dvcsUrl.DvcsUrl;
}

function makeDependencyEntryWithDetails(options: MakeDependencyEntryWithDetailsOptions): core.DependencyEntry {
  const repoPath = options.repoPath;
  const repoType = repo.getRepoTypeForParams(options.repoPath, options.repoType);
  const parsedMainOrigin = options.parsedMainOrigin;
  const origin = repo.getOrigin(repoPath, repoType);

  console.log(`  ${repoPath}`);
  const entry: core.DependencyEntry = { origin, repoType };
  if (origin === undefined) {
    console.log(util.errorColour("    (origin not specified)"));
  }

  // Pinned, then free, and fallback to locked.
  const lockBranch = repo.getBranch(repoPath, repoType);
  if (lockBranch === undefined) {
    // likely git detached head
    const revision = repo.getRevision(repoPath, repoType);
    console.log(`    (pinned revision to ${revision})`);
    entry.pinRevision = revision;
  } else if (lockBranch !== options.mainBranch) {
    console.log(`    (locked branch to ${lockBranch})`);
    entry.lockBranch = lockBranch;
  } else {
    // Fairly conservative about choosing free.
    let locked = true;
    if (origin !== undefined && parsedMainOrigin !== undefined) {
      const parsedOrigin = dvcsUrl.parse(origin);
      if (dvcsUrl.sameDir(parsedOrigin, parsedMainOrigin)) {
        locked = false;
        console.log("    (free)");
        const relativePath = dvcsUrl.relative(parsedMainOrigin, parsedOrigin);
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
  mainRepoPath: string;
}

export function makeDependencyEntry(options: MakeDependencyEntryOptions): core.DependencyEntry {
  const repoPath = options.repoPath;
  const repoType = repo.getRepoTypeForLocalPath(repoPath);
  const mainBranch = repo.getBranch(options.mainRepoPath);
  const parsedMainOrigin = dvcsUrl.parse(repo.getOrigin(options.mainRepoPath));
  return makeDependencyEntryWithDetails({ repoPath, repoType, mainBranch, parsedMainOrigin});
}


export interface InitOptions {
  manifest?: string;
  root?: string;
}

export function doInit(options: InitOptions) {
  const startDir = process.cwd();

  const relManifestPath = core.manifestPath({ manifest: options.manifest });
  if (fs.existsSync(relManifestPath)) {
    console.log(util.errorColour(`Skipping init, already have ${relManifestPath}`));
    console.log("(Delete it to start over, or did you want \"fab install\"?)");
    util.terminate();
    return;
  }
  const absManifestPath = path.resolve(startDir, relManifestPath);

  // Find main origin, if we can.
  const mainRepoType = repo.getRepoTypeForLocalPath(".");
  const mainOrigin = repo.getOrigin(".", mainRepoType);
  const mainBranch = repo.getBranch(".", mainRepoType);
  let parsedMainOrigin: dvcsUrl.DvcsUrl;
  if (mainOrigin === undefined) {
    console.log(util.errorColour("(origin not specified for starting repo)"));
  } else {
    parsedMainOrigin = dvcsUrl.parse(mainOrigin);
  }

  // Sort out main and root paths
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

  // Dependencies (implicitly finds main too, but that gets deleted)
  process.chdir(rootAbsolutePath);
  const dependencies: core.Dependencies = {};
  findRepositories(".", (repoPath, repoType) => {
    const entry = makeDependencyEntryWithDetails({ repoPath, repoType, mainBranch, parsedMainOrigin });
    dependencies[util.normalizeToPosix(repoPath)] = entry;
  });
  delete dependencies[mainFromRoot];

  const manifest: core.Manifest = {
    dependencies,
    rootDirectory: util.normalizeToPosix(rootFromMain),
    mainPathFromRoot: util.normalizeToPosix(mainFromRoot),
    tipsForManualEditing: [
      "The origin property for dependencies can be an URL ",
      "  or a relative path which is relative to the main repo origin.)",
      "The key for the dependencies map is the local relative path from the root directory.",
      "Use forward slashes in paths (e.g. path/to not path\to).",
      "Dependent repos come in three flavours, determined by the properties:",
      "  1) if has pinRevision property, repo pinned to specified revision or tag (commit-ish)",
      "  2) if has lockBranch property, repo locked to specified branch",
      "  3) otherwise, repo is free and included in branch affecting commands",
    ],
  };

  const manifestDir = path.dirname(absManifestPath);
  fsX.ensureDirSync(manifestDir);
  fsX.writeJsonSync(absManifestPath, manifest, { spaces: 2 });

  console.log(`Initialised dependencies in ${relManifestPath}`);

  // Root placeholder file. Safe to overwrite as low content.
  core.writeRootFile({
    rootFilePath: path.join(rootAbsolutePath, core.fabRootFilename),
    mainPath: mainFromRoot,
    manifest: options.manifest,
    tipToAddToIgnore: true,
  });

  // Offer clue for possible sibling init situation.
  if (Object.keys(dependencies).length === 0) {
    console.log("(No dependencies found. For a sibling repo layout use \"fab init --root ..\")");
  }
  process.chdir(startDir); // Simplify unit tests and reuse
}
