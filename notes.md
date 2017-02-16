# arm

Backlog
* rename git repository and npm package
  * http://stackoverflow.com/questions/28371669/renaming-a-published-npm-module
* need support for creating relative path for dependencies on Windows as posix

Version Plan (even/odd, linked different than published)
* bump version and do not tag after publish
* bump version with tag just before publish

Known Issues
* warn when init on empty repo??? Because:
 * "arm outgoing" fails for empty git repo
 * "arm clone" fails for locked empty git repo
 * "arm make-branch" publish fails for branch in empty repo
 * "hg pull" on empty repo causes error
* Test operations with changes in repo, check fail elegantly
 * "arm pull" claims on detached head when have local changes? (Might have been empty branch problem)
* local origin on Windows probably not working (need support for Windows path in multiple places)
* hg
 * "hg push" returns status 1 so breaks for-each
 * if "hg pull" gets nothing then no need to call "hg update"
 * not auto-detecting pinned revision (could do it by detecting not on tip)
* Say goodbye to simple bisect, not storing state by design.
* using colours for logging errors and commands, but will clash with some terminal colours!
* flat gitlab layout means might default to a lot of relative repos, review init behaviour if necessary.
* no warning about excess arguments passed to command (not supported by commander and work-arounds proved fragile)

Backlog Possibles
* multiple manifest files, e.g. HRVMasterStable ?
  * move manifest to .arm folder?
  * manifest list
  * handle clone with no default manifest and no manifest specified, list manifests
* unit tests (nested operations, sibling operations, pin/lock/free)
 * https://evanhahn.com/how-do-i-jasmine/
 * https://jasmine.github.io/2.0/introduction.html
* typescript
* for-fun
 * --pinned --locked --free --all
 * --git --hg (default to all, but supports mixed repo types!)
 * git X == for --git git X ?
 * hg X == for --hg hg X ?
* tidier if use '.' rather than '' for nested rootDirectory et al ?
* help for modifying dependencies in manifest?
  * add/remove
  * pin/lock/free/auto
  * relative/absolute (rarer!)
  * see gitslave and gitsubmodule and npm for examples of command support
* assertNoArgs is unreliable and relying on internal detail
* might be able to detect un-matched commands cleanly with .command('*')

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

Other Approaches
* git submodules
* git subtree
* (google) repo
* braid
* gits (git slave)
* mr (multiple repositories)
