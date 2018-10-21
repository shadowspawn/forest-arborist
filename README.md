# Forest Arborist

[![npm version](https://img.shields.io/npm/v/@shadowspawn/forest-arborist.svg)](https://www.npmjs.com/package/@shadowspawn/forest-arborist)
[![travis build](https://img.shields.io/travis/JohnRGee/forest-arborist/master.svg?logo=travis)](https://travis-ci.org/JohnRGee/forest-arborist)
[![appveyor build](https://img.shields.io/appveyor/ci/JohnRGee/forest-arborist/master.svg?logo=appveyor)](https://ci.appveyor.com/project/JohnRGee/forest-arborist)

- [Forest Arborist](#forest-arborist)
    - [Overview](#overview)
    - [Installation](#installation)
    - [Forest Management Commands](#forest-management-commands)
    - [Utility Commands](#utility-commands)
    - [Working With Branches](#working-with-branches)
    - [Reproducing Forest State](#reproducing-forest-state)
    - [Dependent Repository Types](#dependent-repository-types)
    - [Manifest Files (Internals)](#manifest-files-internals)
    - [Command-line Tab Completion](#command-line-tab-completion)
    - [Colour Output](#colour-output)
    - [Developing](#developing)

## Overview

Provide key operations on a loosely coupled forest of repositories. The
forest can be nested under a main repo or siblings in a plain directory. Supports
both Git and Mercurial repositories. Inspired by experience with Mercurial subrepositories. Tested on MacOS, Windows, and Linux.

Aims to be lightweight and coexist with other tooling, rather than intrusive and opinionated.

Uses a manifest file in the seed repo and a marker file at the root of the forest.
Allows most commands to be run from anywhere in the forest, by searching up for
the root marker file.

Terminology:

- _forest_: a collection of repositories and their working trees
- _root_: directory at the root of the forest
- _manifest_: lists dependent repositories and forest configuration
- _seed_ repository: where the manifest is stored

## Installation

Requires `node` and `npm`.

    npm install --global @shadowspawn/forest-arborist
    fab help

## Forest Management Commands

To add `fab` to an existing forest you run `init` from the seed repo where you want the manifest to be stored.

- `fab init` from root repo for a nested forest
- `fab init --root ..` from seed repo for a sibling forest

You `clone` a seed repo to get the forest. This uses the manifest to find the dependent repos and forest layout.

    fab clone ssh://user@host:/path

If you have more than one combination of repos you use, such as different
platform libraries or production vs development, you can specify a manifest name:

    fab init --manifest mac
    fab clone --manifest mac ssh://user@host:/path

To (re)install dependent repos if the manifest has changed, or install dependent repos after cloning just the seed repo:

    fab install

## Utility Commands

To see a compact status listing for each repo in the forest:

    fab status

To pull new changesets:

    fab pull

There are two commands which take an explicit additional command to run across the forest. A `--` is used to mark the end of the `fab` options, and is optional if there are no options in the additional command. (_free_ is explained in [Dependent Repository Types](#dependent-repository-types))

    fab for-each -- git remote -v
    fab for-free -- git branch

There are two commands which run specifically `git` or `hg` commands across the forest repositories of matching type:

    fab git -- remote -v
    fab hg -- summary

## Working With Branches

You can specify the starting branch when you make the clone:

    fab clone --branch develop ssh://user@host:/path

There are commands to make a new branch and to switch to an existing branch:

    fab make-branch feature/bells
    fab make-branch --publish feature/working-with-others
    fab switch master

The branch commands operate on the _free_ repositories, and not the _pinned_ or _locked_ repositories. (See [Dependent Repository Types](#dependent-repository-types).)

## Reproducing Forest State

There are three commands for reproducing forest state:

- `snapshot` produces a listing of the current forest and changesets
- `restore` takes the current forest back to the snapshot state
- `recreate` is like clone but takes a snapshot file

Example commands:

    fab snapshot --output ~/snapshot1
    git pull
    fab restore ~/snapshot1
    cd ~/sandpit
    fab recreate ~/snapshot1 myTempRepo

## Dependent Repository Types

Some of the repositories you work with are actively developed along with the seed repo,
while some might actively track the release branch of a library, and some should stay fixed
at a specific version.

The dependent repos can be configured in three ways:

- _pinned_ to a specified changeset or tag
- _locked_ to a specified branch
- _free_ to follow the seed repo

The various commands operate on an appropriate subset of the repos. For example
the switch command only affects the _free_ repositories, the pull command affects
_free_ and _locked_, and the status command runs on all the repos.

## Manifest Files (Internals)

The manifest specifies the forest layout and the dependent repository details. The manifest file can be automatically generated by:

- `fab init` from master repository for a nested forest
- `fab init --root ..` from seed repo for a sibling forest
- `fab init --manifest name` to save a custom manifest

You can manage the manifest contents with the `manifest` command:

- `fab manifest` show path to manifest
- `fab manifest --edit` open manifest in editor
- `fab manifest --list` list dependencies from manifest
- `fab manifest --add newRepo` add entry to manifest dependencies
- `fab manifest --delete staleRepo` delete entry from manifest dependencies

The _dependencies_ map is where you might do some hand editing. The map key
is the working directory relative to the root of the forest. The properties are:

- origin: remote repo. Either absolute or relative to the seed origin.
- repoType: "git" or "hg"
- pinRevision: if pinned, changeset or tag
- lockBranch: if locked, branch name

Example:

```json
{"dependencies": {
    "Libs/Locked": {
    "origin": "git@github.com:Person/Locked.git ",
    "repoType": "git",
    "lockBranch": "master"
    },
    "Libs/Pinned": {
    "origin": "git@github.com:Person/Pinned.git ",
    "repoType": "git",
    "pinRevision": "ce12a1b401e72f7808ab3da7a696a5ab4cd364fe"
    },
    "RelativeFree": {
    "origin": "../relative-to-seed.git",
    "repoType": "git"
    }
},
"rootDirectory": ".",
"seedPathFromRoot": "."
}
```

The manifests are stored in the `.fab` folder of the seed repo.
Custom manifests follow the template &lt;custom&gt;\_manifest.json.

## Command-line Tab Completion

For trying out shell completion on Linux:

    source < (fab completion)

on Mac:

    eval `$(fab completion)`

To install, write the output of `fab completion` to a shell startup file, or to a file and invoke from a shell startup file.
(c.f. [npm completion](https://docs.npmjs.com/cli/completion))

## Colour Output

Colour output is off by default on Windows and on by default for other platforms. You can explicitly enable or disable colour using [FORCE_COLOR](https://www.npmjs.com/package/chalk#chalksupportscolor), or disable colour using [NO_COLOR](http://no-color.org).

## Developing

| Branch | MacOS & Linux | Windows |
| --- | --- | --- |
| develop | [![travis build](https://img.shields.io/travis/JohnRGee/forest-arborist/develop.svg?logo=travis)](https://travis-ci.org/JohnRGee/forest-arborist) | [![appveyor build](https://img.shields.io/appveyor/ci/JohnRGee/forest-arborist/develop.svg?logo=appveyor)](https://ci.appveyor.com/project/JohnRGee/forest-arborist) |

Quick start:

    git clone --branch develop git@github.com:JohnRGee/forest-arborist.git
    cd forest-arborist
    npm install
    npm link
    npm run test
