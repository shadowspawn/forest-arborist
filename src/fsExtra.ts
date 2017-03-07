// fs helper routines

import fs = require("fs");


export function fileExistsSync(filePath: string) {
    try {
      return fs.statSync(filePath).isFile();
    } catch (err) {
      if (err.code === "ENOENT") {
        return false;
      }
      throw err;
    }
  };


export function dirExistsSync(filePath: string) {
    try {
      return fs.statSync(filePath).isDirectory();
    } catch (err) {
      if (err.code === "ENOENT") {
        return false;
      }
      throw err;
    }
  };
