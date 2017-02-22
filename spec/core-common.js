'use strict';

// Mine
const core = require('../lib/core');
const util = require('../lib/util');


module.exports = {


  quietDoInit(options) {
    // Classic use of mute, suppress output from (our own) module that does not support it!
    const unmute = util.recursiveMute();
    try {
      core.doInit(options);
      unmute();
    } catch (err) {
      unmute();
      throw err;
    }
  },


};
