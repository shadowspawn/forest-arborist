import childProcess = require("child_process");
import path = require("path");
import fsX = require("fs-extra");
import process = require("process");
// Mine
import core = require("./core");
import coreInit = require("./core-init");
import util = require("./util");


function rootRelative(startDir: string, optionalPath: boolean | string) {
  const targetPath = (typeof optionalPath === "boolean") ? "." : optionalPath;
  const absolutePath = path.resolve(startDir, targetPath);
  // Assume running from root dir
  return path.relative(process.cwd(), absolutePath);
}

export interface ManifestOptions {
  edit?: boolean;
  add?: boolean | string;
  delete?: boolean | string;
  list?: boolean;
}

export function doManifest(options: ManifestOptions) {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const rootObject = core.readRootFile();
  const mainPath = path.resolve(process.cwd(), rootObject.mainPath);
  const manifestPath = core.manifestPath({ mainPath });

  if (options.edit) {
    // Same checks as osenv.editor
    const editor = process.env.EDITOR
      || process.env.VISUAL
      ||((process.platform === "win32") ? "notepad.exe" : "vi");
      childProcess.execFileSync(editor, [manifestPath], { stdio: "inherit" });
  } else if (options.list) {
    const manifestObject = core.readManifest({ mainPath });
    delete manifestObject.tipsForManualEditing;
    console.log(JSON.stringify(manifestObject, undefined, "  "));
  } else if (options.add) {
    const targetPath = rootRelative(startDir, options.add);
    const manifestObject = core.readManifest({ mainPath });
    console.log(`Added dependency for ${path.resolve(process.cwd(), targetPath)}`);
    manifestObject.dependencies[util.normalizeToPosix(targetPath)] = coreInit.makeDependencyEntry({
      repoPath: targetPath,
      mainRepoPath: mainPath,
    });
    fsX.writeJsonSync(manifestPath, manifestObject, { spaces: 2 });
  } else if (options.delete) {
    const targetPath = rootRelative(startDir, options.delete);
    const manifestObject = core.readManifest({ mainPath });
    if (manifestObject.dependencies[targetPath] === undefined) {
      util.terminate(`No manifest dependency for: ${targetPath}`);
    }
    delete manifestObject.dependencies[targetPath];
    fsX.writeJsonSync(manifestPath, manifestObject, { spaces: 2 });
    console.log(`Deleted manifest dependency for ${targetPath}`);
  } else {
    // Do something vaguelu useful, like `fab root` and `fab main`
    console.log(manifestPath);
  }
  process.chdir(startDir);
}

