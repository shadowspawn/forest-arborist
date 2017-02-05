# arm

pinCheckout (left out of pull and branching)
lockBranch (left out of branching)
free? (unpinned, unlocked)

Backlog
* detect branch on init
* detect lockBranch on init
* set lockBranch on clone
* cope with detached head, pinCheckout
* forfree
* support re-install
* manifest edit ?
* manifest show ?

Future Possibilities
* origin references relative to main needed for forks
* install could/should reapply checkout steps (not clone)
* detecting clean before doing suspect operations?
  * detect detached head before moving away? Prob can't.
* qualifier for clone of siblings so creates wrapper folder
* script for merging develop into master, bump version, push, npm publish
  * sanity checks, lint, dependencies
  * copy-up: checkout master, merge develop
  * npm version patch
  * deploy: npm publish, git push
* snapshot
  * save
  * restore
  * clone --snapshot? Might not make sense for git.
* save/restore or freeze of whatever for reproducible working group state [snapshot?]
* multiple manifest files, e.g. HRVMasterStable ?
  * move manifest to .arm folder?
  * manifest list
  * handle clone with no default manifest and no manifest specified
* something to check for merges already in progress etc, check, pure expectedProtocols
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
