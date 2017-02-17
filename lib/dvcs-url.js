'use strict';

const url = require('url');
const path = require('path');

// Reasons for parsing URLs:
//  - look for same parent folder during init to default to a relative origin
//  - relative origin processing
//  - predict resulting directory from a clone

// Work with URLs used by Git and Mercurial.
// Do it ourselves!

// See GIT URLS on https://git-scm.com/docs/git-clone
//
// The following syntaxes may be used:
//   ssh://[user@]host.xz[:port]/path/to/repo.git/
//   git://host.xz[:port]/path/to/repo.git/
//   http[s]://host.xz[:port]/path/to/repo.git/
//   ftp[s]://host.xz[:port]/path/to/repo.git/
//
// An alternative scp-like syntax may also be used with the ssh protocol:
//   [user@]host.xz:path/to/repo.git/
// This syntax is only recognized if there are no slashes before the first colon.  ...
//
// For local repositories, also supported by Git natively, the following syntaxes may be used:
//   /path/to/repo.git/
//   file:///path/to/repo.git/

// See "hg help urls"
//
// Valid URLs are of the form:
//   local/filesystem/path[#revision]
//   file://local/filesystem/path[#revision]
//   http://[user[:pass]@]host[:port]/[path][#revision]
//   https://[user[:pass]@]host[:port]/[path][#revision]
//   ssh://[user@]host[:port]/[path][#revision]


module.exports = {


  parse(urlString) {
    if (urlString === undefined) return undefined;

    // Parsing for git covers hg as well, sweet!
    const result = {};
    const parsed = url.parse(urlString);
    const recognisedProtocols = ['ssh:', 'git:', 'http:', 'https:', 'ftp:', 'ftps:', 'file:'];
    if (recognisedProtocols.indexOf(parsed.protocol) > -1) {
      result.protocol = parsed.protocol;
      result.pathname = parsed.pathname;
      result.href = parsed.href;
    } else {
      // git variation.
      //   An alternative scp-like syntax may also be used with the ssh protocol:
      //     [user@]host.xz:path/to/repo.git/
      //   This syntax is only recognized if there are no slashes before the first colon.
      const slashPos = urlString.indexOf('/');
      const colonPos = urlString.indexOf(':');
      if (colonPos > 0 && ((slashPos === -1) || (slashPos > colonPos))) {
        result.protocol = 'scp'; // leave off colon for fake protocol
        result.pathname = urlString.substring(colonPos + 1);
        result.authAndHost = urlString.substring(0, colonPos);
      } else {
        // 1. Not supporting hg #revision here yet, add if needed.
        // 2. Do we need to support windows local paths?
        result.protocol = 'path-posix'; // leave off colon for fake protocol
        result.pathname = urlString;
      }
    }

    return result;
  },


  sameDir(object1, object2) {
    // When getting started and user still has empty repos, we may not yet know origin.
    if (object1 === undefined || object2 === undefined) return false;
    // Do the obvious test first.
    if (object1.protocol !== object2.protocol) return false;

    // Do the fake protocols first
    if (object1.protocol === 'path-posix') {
      return (path.posix.dirname(object1.pathname) === path.posix.dirname(object2.pathname));
    } else if (object1.protocol === 'scp') {
      return (object1.authAndHost === object2.authAndHost)
        && (path.posix.dirname(object1.pathname) === path.posix.dirname(object2.pathname));
    }

    // Proper protocol! Tweak path and reconstruct full URL for dir.
    const dir1 = url.parse(object1.href);
    dir1.pathname = path.posix.dirname(dir1.pathname);
    const dir2 = url.parse(object2.href);
    dir2.pathname = path.posix.dirname(dir2.pathname);
    return url.format(dir1) === url.format(dir2);
  },


  resolve(urlObject, relativePath) {
    // Do the fake protocols first
    if (urlObject.protocol === 'path-posix') {
      const temp = path.posix.resolve(urlObject.pathname, relativePath);
      return path.posix.normalize(temp);
    } else if (urlObject.protocol === 'scp') {
      const temp = path.posix.join(urlObject.pathname, relativePath);
      const absolutePathname = path.posix.normalize(temp);
      return `${urlObject.authAndHost}:${absolutePathname}`;
    }

    // Proper protocol! Tweak path and reconstruct full URL.
    const parsedTemp = url.parse(urlObject.href);
    const temp2 = path.posix.join(urlObject.pathname, relativePath);
    parsedTemp.pathname = path.posix.normalize(temp2);
    return url.format(parsedTemp);
  },


};
