# arm

Another Repository Manager

Inspired by Mercurial subrepositories and hgh. Provide convenient management of an array of repositories (i.e. no nesting of repositories). Support a mixture of git and Mercurial repositories.

Use a config file in the nominal master repo and a pointer file in the root. Allows the commands to run from anywhere in the tree, by searching up for the control file or the pointer file.

## config file format (arm.json)

### dependencies

Array of urls for repositories. Can optionally specify root relative path.

    {"dependencies":
       {
       "CrossPlatform": "ssh://hg@hg.adi.co.nz/hg/App/CrossPlatform#Stable",
       "Libs/Boost": "ssh://hg@hg.adi.co.nz/hg/Libs/BoostLite"}
       }
    }

To do: support # syntax for tag/branch/changeset for git, Mercurial does it itself

c.f. npm package dependencies

Thoughts:
* maybe full object for source
* maybe array rather than set
* Fields if needed:
   * repo_url
   * branch/tag/changeset
   * DVCS in case can not deduce from URL (git/hg)
   * subfolder. e.g. Libs

## Commands

### install

Clone the dependent repositories according to the config file.

c.f. npm install

## Musing

ToDo
* basic command line processing
* lint
* typescript?

- control file at top of ordinary repo, which is part of tree
- Summon dependencies
- Clone repo (with control) and summon
- Init
    - add pointer file
- Find tree by searching up for control file or root
- Put placeholder in root identifying control repo
- Save/restore, single or by name? Name is appealing except that is what DVCS tag etc are for
- Support using hgsub instead of arm.json including pointer file?

Command names
- install, like npm, install dependencies
- clone
- init to create a config file if not present, and add the pointer file
- root (root and control holder)
- scan? Look for add/removed repos
- install? Clone new repo and added to control
- Themes for areas, rather than sub commands? Cooking, magic
- config?

Control file repo fields
- source/url/origin for clone
- optional branch after clone
- optional sub folder like for Libs
- (not support renaming repos, low value)

Terminology
- npm
- git
- Mercurial

## References

Developer
* [w3schools javascript](http://www.w3schools.com/js/default.asp)
* [node](https://nodejs.org/docs/latest/api/index.html)

Shell scripting
* [Building command line tools with Node.js](https://developer.atlassian.com/blog/2015/11/scripting-with-node/) from Atlassian

Shell utility
* [shelljs](http://documentup.com/arturadib/shelljs#command-reference)

Command line parsing
* [yargs](https://www.npmjs.com/package/yargs)
* [command](https://www.npmjs.com/package/commander)

Colouring output
* [chalk](https://github.com/sindresorhus/chalk)
* [cli-color](https://www.npmjs.org/package/cli-color)
