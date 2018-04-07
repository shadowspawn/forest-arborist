# Forest Arborist

## Backlog

## Known Issues

- hg specific issues (low priority at moment)
    - "hg push" returns status 1 so breaks for-each
    - if "hg pull" gets nothing then no need to call "hg update"
    - not auto-detecting pinned revision (could do it by detecting not on tip)
- no warning about excess arguments passed to command (not supported by commander and work-arounds proved fragile)

## Backlog Musing

- locally testing publish+install, npm pack + install tarball (+ uninstall needs tarball)
    - previous try was: "test:install": "npm unlink . && npm uninstall -g . && npm install -g . && npm run test:fabonly",
- move command.ts to src, but (on Mac) complicates updates as breaks fab link
- try np for tidy publish
- suffix for peer checkout, so by default do not get foo/foo. (e.g. for-checkout, foo-forest)

## Patterns

Version Plan

- Use different versions on master (published) and develop (linked work in progress).
- Tag version on master to match the published version.
- Do not tag version on develop since changes. Use prerelease on develop.
- See copy-up and copy-down run commands.

Terminology Inspirations

- git
- Mercurial
- npm

## References

Using

- [command](https://www.npmjs.com/package/commander)
- [chalk](https://github.com/sindresorhus/chalk)

Developer

- [w3schools javascript](http://www.w3schools.com/js/default.asp)
- [node](https://nodejs.org/docs/latest/api/index.html)
- [node ES6 support](http://node.green)
- [Building command line tools with Node.js](https://developer.atlassian.com/blog/2015/11/scripting-with-node/) from Atlassian

Interesting

- [shelljs](http://documentup.com/arturadib/shelljs#command-reference)
- [async](http://caolan.github.io/async/)
- [defaults](https://www.npmjs.com/package/defaults)
- [omnipath](https://www.npmjs.com/package/omnipath) for transparent consistent handling of paths and urls

git-flow equivalent git commands

- <https://gist.github.com/JamesMGreene/cdd0ac49f90c987e45ac>

Other Approaches

- git submodules
- git subtree
- (google) repo
- braid
- gits (git slave)
- mr (multiple repositories)
