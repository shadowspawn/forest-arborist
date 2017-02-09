# arm

Backlog
* decide what to do with clone target after find out whether nested??
  * nested: arm clone a b, end up with nested a called b
  * sibling: arm clone a b, end up with a inside b (at least for ..)
  * can handle arbitrary depth for init, but not for clone! Could store nestPath...
   * make path for nestedPath
   * move initial checkout to nestPath

Known Issues
* do we need support for Windows paths in sameParsedOriginDir, path.relative et al?

Future Possibilities
* do we need makeBranch? checkout + branch + track/origin for push
  * from current? from develop? from origin/develop?
  * http://stackoverflow.com/questions/6089294/why-do-i-need-to-do-set-upstream-all-the-time
* do we need switchBranch? Just checkout.
* support re-install? softly softly
  * note: pull supports --ff-only
  * note checkout branch aborts if would lose uncommitted changes
* detecting clean before doing suspect operations?
  * detect detached head before moving away? Prob can't.
  * detect merges in progress
* qualifier for clone of siblings so creates wrapper folder ?
* script for merging develop into master, bump version, push, npm publish
  * sanity checks, lint, dependencies
  * copy-up: checkout master, merge develop
  * npm version patch
  * deploy: npm publish, git push
* snapshot
  * save
  * restore
  * clone and install ?
  * ss abbreviation for snapshot ?
  * syntax, playing
   * arm snapshot save out.json
   * arm snapshot --save out.json
   * arm snapshot --out out.json
   * arm clone --snapshot x
   * arm install --snapshot x
   * arm restore [filename]
   * arm ss write foo
   * arm ss read foo
   * write save --out (pipe)
   * read restore load (pipe)
   * --full to make a clonable file? Or treat clonable as different than state.
* multiple manifest files, e.g. HRVMasterStable ?
  * move manifest to .arm folder?
  * manifest list
  * handle clone with no default manifest and no manifest specified
* config edit (see git)
* repo or personal preference for rebase vs merge et al
*   or, support pass-through flags for repo commands with -- if useful?
*   or, options for command
* unit tests

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
