import * as path from "path";
import * as url from "url";
// Mine
import * as util from "./util";

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


export interface DvcsUrl {
  protocol: string;
  pathname: string;
  href?: string;
  scpAuthAndHost?: string;
}

export function parse(urlString?: string): DvcsUrl {
  if (urlString === undefined) {
    return { protocol: "", pathname: "" };
  }

  // Parsing for git covers hg as well, sweet!
  let result: DvcsUrl;
  const parsed = url.parse(urlString);
  const recognisedProtocols = ["ssh:", "git:", "http:", "https:", "ftp:", "ftps:", "file:"];
  if (parsed.protocol !== undefined && recognisedProtocols.indexOf(parsed.protocol) > -1) {
    result = {
      protocol: parsed.protocol,
      pathname: (parsed.pathname !== undefined ? parsed.pathname : ""),
      href: parsed.href
    };
  } else {
    const backslashPos = urlString.indexOf("\\");
    const slashPos = urlString.indexOf("/");
    const colonPos = urlString.indexOf(":");
    if (backslashPos !== -1 && slashPos === -1) {
      // Crude test for Windows file path
      result = {
        protocol: "path-win32", // leave off colon for fake protocol
        pathname: urlString
      };
    } else if (colonPos > 0 && ((slashPos === -1) || (slashPos > colonPos))) {
      // git variation.
      //   An alternative scp-like syntax may also be used with the ssh protocol:
      //     [user@]host.xz:path/to/repo.git/
      //   This syntax is only recognized if there are no slashes before the first colon.
      result = {
        protocol: "scp", // leave off colon for fake protocol
        pathname: urlString.substring(colonPos + 1),
        scpAuthAndHost: urlString.substring(0, colonPos)
      };
    } else {
      result = {
        protocol: "path-posix", // leave off colon for fake protocol
        pathname: urlString
      };
    }
  }

  return result;
}


export function sameDir(object1: DvcsUrl, object2: DvcsUrl): boolean {
  // When getting started and user still has empty repos, we may not yet know origin.
  if (object1 === undefined || object2 === undefined) return false;
  // Do the obvious test first.
  if (object1.protocol !== object2.protocol) return false;

  // Do the fake protocols first
  if (object1.protocol === "path-posix") {
    return (path.posix.dirname(object1.pathname) === path.posix.dirname(object2.pathname));
  } else if (object1.protocol === "path-win32") {
    return (path.win32.dirname(object1.pathname) === path.win32.dirname(object2.pathname));
  } else if (object1.protocol === "scp") {
    return (object1.scpAuthAndHost === object2.scpAuthAndHost)
      && (path.posix.dirname(object1.pathname) === path.posix.dirname(object2.pathname));
  }

  // Proper protocol! Tweak path and reconstruct full URL for dir.
  if (object1.href === undefined) return false;
  const dir1 = url.parse(object1.href);
  if (dir1.pathname !== undefined) dir1.pathname = path.posix.dirname(dir1.pathname);
  if (object2.href === undefined) return false;
  const dir2 = url.parse(object2.href);
  if (dir2.pathname !== undefined) dir2.pathname = path.posix.dirname(dir2.pathname);
  return url.format(dir1) === url.format(dir2);
}


// like basename
export function repoName(urlObject: DvcsUrl): string {
  if (urlObject.protocol === "path-win32") {
    return path.win32.basename(urlObject.pathname, ".git");
  }

  return path.posix.basename(urlObject.pathname, ".git");
}


// like basename
export function relative(object1: DvcsUrl, object2: DvcsUrl): string {
  // We assume that client already determined this is a reasonable question!
  if (object1.protocol === "path-win32") {
    const relativePath = path.win32.relative(object1.pathname, object2.pathname);
    return util.normalizeToPosix(relativePath);
  }

  return path.posix.relative(object1.pathname, object2.pathname);
}


export function resolve(urlObject: DvcsUrl, relativePath: string): string {
  // Do the fake protocols first
  if (urlObject.protocol === "path-posix") {
    const temp = path.posix.resolve(urlObject.pathname, relativePath);
    return path.posix.normalize(temp);
  } else if (urlObject.protocol === "path-win32") {
    const temp = path.win32.resolve(urlObject.pathname, relativePath);
    return path.win32.normalize(temp);
  } else if (urlObject.protocol === "scp") {
    const temp = path.posix.join(urlObject.pathname, relativePath);
    const absolutePathname = path.posix.normalize(temp);
    return `${urlObject.scpAuthAndHost}:${absolutePathname}`;
  }

  // Proper protocol! Tweak path and reconstruct full URL.
  if (urlObject.href === undefined) return relativePath;
  const parsedTemp = url.parse(urlObject.href);
  const temp2 = path.posix.join(urlObject.pathname, relativePath);
  parsedTemp.pathname = path.posix.normalize(temp2);
  return url.format(parsedTemp);
}


export function isRelativePath(pathname: string) {
  if (pathname === null || pathname === undefined) { return false; }

  // (string.startsWith only available from ES6)
  return pathname.indexOf("./") === 0 || pathname.indexOf("../") === 0;
}
