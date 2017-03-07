import fs = require("fs");
import path = require("path");
// Mine
import core = require("./core");
import dvcsUrl = require("./dvcs-url");
import fsX = require("./fsExtra");
import repo = require("./repo");
import util = require("./util");


interface FindRepositoriesCallback { (repoPath:  string, repoType: string): void; };


function findRepositories(startingDirectory: string, callback: FindRepositoriesCallback) {
  if (startingDirectory === ".hg" || startingDirectory === ".git") {
    return; // No point searching inside control folders
  }

  const itemList = fs.readdirSync(startingDirectory);
  itemList.forEach((item) => {
    const itemPath = path.join(startingDirectory, item);
    if (fsX.dirExistsSync(itemPath)) {
      if (fsX.dirExistsSync(path.join(itemPath, ".git"))) {
        callback(itemPath, "git");
      } else if (fsX.dirExistsSync(path.join(itemPath, ".hg"))) {
        callback(itemPath, "hg");
      }

      // Keep searching in case of nested repos.
      findRepositories(itemPath, callback);
    }
  });
}


export interface InitOptions {
  manifest?: string;
  root?: string;
}


export function doInit(options: InitOptions) {
  const startDir = process.cwd();

  const relManifestPath = core.manifestPath({ manifest: options.manifest });
  if (fsX.fileExistsSync(relManifestPath)) {
    console.log(`Skipping init, already have ${relManifestPath}`);
    console.log("(Delete it to start over, or did you want \"fab install\"?)");
    return;
  }
  const absManifestPath = path.resolve(".", relManifestPath);

  // Find main origin, if we can.
  const mainRepoType = repo.getRepoTypeForLocalPath(".");
  if (mainRepoType === undefined) {
    util.terminate("expecting current directory to have a repository. (KISS)");
  }
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
    rootAbsolutePath = path.resolve(options.root);
    console.log("Scanning for dependencies from root…");
  }
  const mainFromRoot = path.relative(rootAbsolutePath, mainAbsolutePath);
  const rootFromMain = path.relative(mainAbsolutePath, rootAbsolutePath);

  // Dependencies (implicitly finds main too, but that gets deleted)
  process.chdir(rootAbsolutePath);
  const dependencies: any = {};
  findRepositories(".", (repoPathParam, repoType) => {
    const repoPath = util.normalizeToPosix(repoPathParam);
    console.log(`  ${repoPath}`);
    const origin = repo.getOrigin(repoPath, repoType);
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
    } else if (lockBranch !== mainBranch) {
      console.log(`    (locked branch to ${lockBranch})`);
      entry.lockBranch = lockBranch;
    } else {
      // This made sense for our original hg repo layout, peer repos have same parent.
      // May need to refine with wider use.
      let sameParent = false;
      let parsedOrigin;
      if (origin !== undefined) {
        parsedOrigin = dvcsUrl.parse(origin);
        sameParent = dvcsUrl.sameDir(parsedOrigin, parsedMainOrigin);
      }
      if (sameParent) {
        console.log("    (free)");
        const relativePath = dvcsUrl.relative(parsedMainOrigin, parsedOrigin);
        // Should always be true?
        if (util.isRelativePath(relativePath)) {
          entry.origin = relativePath;
        }
      } else {
        console.log(`    (locked branch to ${lockBranch})`);
        entry.lockBranch = lockBranch;
      }
    }
    dependencies[repoPath] = entry;
  });
  delete dependencies[mainFromRoot];

  const manifest = {
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
  const prettyManifest = JSON.stringify(manifest, null, "  ");

  const manifestDir = path.dirname(absManifestPath);
  if (!fsX.dirExistsSync(manifestDir)) fs.mkdirSync(manifestDir);
  fs.writeFileSync(absManifestPath, prettyManifest);
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
};
