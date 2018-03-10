# Forest Arborist

Provide key operations on a loosely coupled forest of repositories. The
forest can be nested under a main repo or siblings in a plain directory. Supports
both Git and Mercurial repositories. Inspired by experience with Mercurial subrepositories.

Aims to be lightweight and coexist with other tooling, rather than intrusive and opinionated.

Uses a manifest file in the main repo and a marker file at the root of the forest.
Allows some commands to be run from anywhere in the forest, by searching up for
the root marker file.

Terminology:

- forest: a collection of repositories and their working trees
- root: directory at the root of the forest
- manifest: lists dependent repositories and forest configuration
- main repository: where the manifest is stored

## Getting Started

To create a manifest from an existing forest you run `init` from the main repo:

    fab init

Commit the manifest file, and then you can `clone` the main repo to get the forest:

    fab clone ssh://user@host:/path

If you have more than one combination of repos you use, such as different
platform libraries or production vs development, you can specify a manifest name:

    fab init --manifest mac
    fab clone --manifest mac ssh://user@host:/path

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

## Working With Branches

You can specify the starting branch when you make the clone:

    fab clone --branch develop ssh://user@host:/path

There are commands to make a new branch and to switch to an existing branch:

    fab make-branch feature/bells
    fab switch master

The branch commands operate on the _free_ repositories, and not the pinned or locked repositories. (See next section.)

## Dependent Repository Types

Some of the repositories you work with are actively developed along with the main repo,
while some might actively track the release branch of a library, and some should stay fixed
at a specific version.

The dependent repos can be configured in three ways:

- pinned to a specified changeset or tag
- locked to a specified branch
- free to follow the main repo

The various commands operate on an appropriate subset of the repos. For example
the switch command only affects the free repositories, the pull command affects
free and locked, and the status command runs on all the repos.

There are two general purpose convenience routines to run commands across the forest. A `--` is used to mark the end of the fab options, and is optional if there are no additional options.
e.g.

    fab for-each -- git remote -v
    fab for-free -- git branch

## Help

    fab
    fab --help
    fab clone --help

## Manifest Files (Internals)

The manifest specifies the forest layout and the dependent repository details. The manifest file can be automatically generated by:

- `fab init` from master repository for a nested forest
- `fab init --root ..` from main repo for a sibling forest
- `fab init --manifest name` to save a custom manifest

The _dependencies_ map is where you might do some hand editing. The map key
is the working directory relative to the root of the forest. The properties are:

- origin: remote repo. Either absolute or relative to the main origin.
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
    "origin": "../relative-to-main.git",
    "repoType": "git"
    }
},
"rootDirectory": ".",
"mainPathFromRoot": "."
}
```

The manifests are stored in the `.fab` folder of the main repo.
Custom manifests follow the template &lt;custom&gt;\_manifest.json.

## Command-line Completion

For trying out shell completion on Lin:

    source < (fab completion)

on Mac:

    eval `$(fab completion)`

To install, write the output of `fab completion` to a shell startup file. (c.f. [npm completion](https://docs.npmjs.com/cli/completion)) For interactive assistance installing the command-line completion:

     npx tabtab install fab --name=fab

## Installing

Requires node and npm. Easy install:

    npm install --global @shadowspawn/forest-arborist

For more flexibility including development:

    git clone https://github.com/JohnRGee/forest-arborist.git
    cd forest-arborist
    npm install
    npm link

## Status

[![npm version](https://img.shields.io/npm/v/@shadowspawn/forest-arborist.svg)](https://www.npmjs.com/package/@shadowspawn/forest-arborist)

builds on master branch:
[![travis status status](https://img.shields.io/travis/JohnRGee/forest-arborist/master.svg?&label=mac+%26+lin)](https://travis-ci.org/JohnRGee/forest-arborist)
[![appveyor status status](https://img.shields.io/appveyor/ci/JohnRGee/forest-arborist/master.svg?label=win)](https://ci.appveyor.com/project/JohnRGee/forest-arborist)

builds on develop branch :
[![travis status status](https://img.shields.io/travis/JohnRGee/forest-arborist/develop.svg?&label=mac+%26+lin)](https://travis-ci.org/JohnRGee/forest-arborist)
[![appveyor status status](https://img.shields.io/appveyor/ci/JohnRGee/forest-arborist/develop.svg?label=win)](https://ci.appveyor.com/project/JohnRGee/forest-arborist)

- OS: used on macOS, Windows, and Linux
- DVCS: main development with git, less testing with hg.
