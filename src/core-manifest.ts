import childProcess = require("child_process");
import path = require("path");
import process = require("process");
// Mine
import core = require("./core");


export interface ManifestOptions {
  edit?: boolean;
  add?: boolean;
  delete?: boolean;
}


export function doManifest(options: ManifestOptions) {
  if (options.edit) {
    core.cdRootDirectory();
    const rootObject = core.readRootFile();
    const mainPath = path.resolve(process.cwd(), rootObject.mainPath);
    const fabManifest = core.manifestPath({ mainPath });

    // Same checks as osenv.editor
    const editor = process.env.EDITOR
      || process.env.VISUAL
      ||((process.platform === "win32") ? "notepad.exe" : "vi");
    childProcess.execFileSync(editor, [fabManifest], { stdio: "inherit" });
  } else if (options.add) {
    console.log(options.add);
    console.log(typeof options.add);
    console.log("Add not imlemented yet");
  } else if (options.delete) {
    console.log("Delete not imlemented yet");
  } else {
    console.log("Unexpected call to manifest command in development");
  }
}

