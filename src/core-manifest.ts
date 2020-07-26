// This file implements the "fab manifest" command options (not the base manifest operations).

import * as childProcess from "child_process";
import * as path from "path";
import * as process from "process";
// Mine
import * as core from "./core";
import * as coreInit from "./core-init";
import * as util from "./util";


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

export function doManifest(options: ManifestOptions): void {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const rootObject = core.readRootFile();
  const seedPath = path.resolve(process.cwd(), rootObject.seedPath);
  const manifestPath = core.manifestPath({ seedPath, manifest: rootObject.manifest });

  if (options.edit) {
    // Same checks as osenv.editor
    const editor = process.env.EDITOR
      || process.env.VISUAL
      ||((process.platform === "win32") ? "notepad.exe" : "vi");
    childProcess.execFileSync(editor, [manifestPath], { stdio: "inherit" });
  } else if (options.list) {
    const manifestObject = core.readManifest({ seedPath, manifest: rootObject.manifest });
    console.log(JSON.stringify(manifestObject, undefined, "  "));
  } else if (options.add) {
    const relTargetPath = rootRelative(startDir, options.add);
    const absTargetPath = path.resolve(process.cwd(), relTargetPath);
    if (seedPath === absTargetPath) {
      util.terminate("Seed folder cannot be added as a dependency");
    }
    const manifestObject = core.readManifest({ seedPath, manifest: rootObject.manifest });
    console.log(`Adding dependency for ${absTargetPath}`);
    manifestObject.dependencies[util.normalizeToPosix(relTargetPath)] = coreInit.makeDependencyEntry({
      repoPath: relTargetPath,
      seedRepoPath: seedPath,
    });
    core.writeManifest(manifestPath, manifestObject);
  } else if (options.delete) {
    const targetPath = rootRelative(startDir, options.delete);
    const manifestObject = core.readManifest({ seedPath, manifest: rootObject.manifest });
    if (manifestObject.dependencies[targetPath] === undefined) {
      util.terminate(`No manifest dependency for: ${targetPath}`);
    }
    delete manifestObject.dependencies[targetPath];
    core.writeManifest(manifestPath, manifestObject);
    console.log(`Deleted manifest dependency for ${targetPath}`);
  } else {
    // Do something vaguely useful, like `fab root` and `fab seed`
    console.log(manifestPath);
  }
  process.chdir(startDir);
}

