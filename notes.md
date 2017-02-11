# arm

Backlog
* try what is needed for create and switch branch

Backlog Possibles
* group commands sensibly (i.e. reorder)
* do we need makeBranch? checkout + branch + track/origin for push
  * from current? from develop? from origin/develop?
  * http://stackoverflow.com/questions/6089294/why-do-i-need-to-do-set-upstream-all-the-time
* do we need switchBranch? (Just checkout?)
* support re-install? softly softly
  * note: pull supports --ff-only
  * note checkout branch aborts if would lose uncommitted changes
* arm development script for
  * merging develop into master, bump version, push, npm publish?
  * sanity checks, lint, dependencies
  * copy-up: checkout master, merge develop
  * npm version patch
  * deploy: npm publish, git push
* multiple manifest files, e.g. HRVMasterStable ?
  * move manifest to .arm folder?
  * manifest list
  * handle clone with no default manifest and no manifest specified
* unit tests
* probably problems with windows path names for origin of hg repos
* status is somewhat low value, but is more compact...
* for
 * --pinned --locked --free --all
 * --git --hg (default to all, but supports mixed repo types!)
 * git X == for --git git X ?
 * hg X == for --hg hg X ?

Known Issues
* do we need support for Windows paths in sameParsedOriginDir, path.relative et al?
* hg support may be less tested

Terminology Inspirations
* git
* Mercurial
* npm

## References

Using
* [command](https://www.npmjs.com/package/commander)
* [chalk](https://github.com/sindresorhus/chalk)

Developer
* [w3schools javascript](http://www.w3schools.com/js/default.asp)
* [node](https://nodejs.org/docs/latest/api/index.html)
* [node ES6 support](http://node.green)
* [Building command line tools with Node.js](https://developer.atlassian.com/blog/2015/11/scripting-with-node/) from Atlassian

Interesting
* [shelljs](http://documentup.com/arturadib/shelljs#command-reference)
* [async](http://caolan.github.io/async/)
* [defaults](https://www.npmjs.com/package/defaults)

git-flow equivalent git commands
* https://gist.github.com/JamesMGreene/cdd0ac49f90c987e45ac
