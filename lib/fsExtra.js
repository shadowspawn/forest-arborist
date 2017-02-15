const fs = require('fs');

// fs helper routines

module.exports = {


  fileExistsSync(filePath) {
    try {
      return fs.statSync(filePath).isFile();
    } catch (err) {
      if (err.code === 'ENOENT') {
        return false;
      }
      throw err;
    }
  },


  dirExistsSync(filePath) {
    try {
      return fs.statSync(filePath).isDirectory();
    } catch (err) {
      if (err.code === 'ENOENT') {
        return false;
      }
      throw err;
    }
  },


};
