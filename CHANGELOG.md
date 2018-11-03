# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

<!-- markdownlint-disable MD024 -->

## [4.0.0] (2018-11-03)

### Added

- `--nested` and `--sibling` options to `fab init` as alternatives to using `--root`

### Changed

- `fab init` now requires specifying forest layout with one of `--sibling`, `--nested`, `--root`

## [3.3.0] (2018-10-21)

### Changed

- rewrote command line tab completion
- dependencies

### Removed

- tabtab module

## [3.2.0] (2018-09-22)

### Changed

- `fab switch` now uses destination branch manifest rather than starting manifest to determine free repos. In addition, applies changes to free/locked/pinned dependency type, and displays a message about missing new repos. Resolves [#8](https://github.com/JohnRGee/forest-arborist/issues/8).

## [3.1.1] (2018-09-15)

### Added

- github issue templates

### Changed

- dependencies
- help format (to match changes made in `commander`)

## [3.1.0] (2018-08-05)

### Added

- `help` command (same as `--help`)

### Fixed

- spurious `Unknown command:` before help when ran `fab` with no command
- indentation in command-line help

### Changed

- list commands in alphabetical order in command-line help

## [3.0.0] (2018-08-04)

Changed nomenclature for the repo containing the manifests from _main_ to _seed_.

### Added

- detection of hg pinned revision in `fab init`
- `fab seed` showing path of seed repo (to replace `fab main`)

### Changed

- README updated for _seed_
- `.fab-root.json` file format updated for _seed_
- manifest file format updated for _seed_. The changes in `fab v3` are forwards and backwards compatible with `fab v1` and `fab v2`, but a future version will drop support for old versions reading the new files.
- snapshot file format updated for _seed_. New files can not be read by `fab v1` and `fab v2`.

### Deprecated

- `fab main` is deprecated and will be removed in a future version

## [2.0.0] (2018-05-21)

### Added

- `fab git` to run git commands on git repos
- `fab hg` to run hg commands on hg repos

### Changed

- BREAKING: cloning a sibling forest from repo "main" without specifying destination now creates a root directory called "main-forest" (previously created root "main" containing main "main").
- no longer logging exceptions when use `--keepgoing` with `for-each` and `for-free`
- refactored tests
- reduced number of commands run for hg repos by `fab pull` (in particular, unnecessary update command)
- detection of local git repos

## [1.2.0] (2018-04-15)

### Added

- `fab manifest` show path to manifest
- `fab manifest --edit` open manifest in editor
- `fab manifest --list` list dependencies from manifest
- `fab manifest --add [repo-path]` add entry to manifest dependencies
- `fab manifest --delete [repo-path]` delete entry from manifest dependencies
- this changelog
- support for [FORCE_COLOR](https://www.npmjs.com/package/chalk#chalksupportscolor), in particular to enable colour on Windows
- support for [NO_COLOR](http://no-color.org) to disable colour

### Changed

- dependencies
- moved command.ts into src folder
- refactored tests to include command parsing

### Removed

- raw command-line help from README

## [1.1.2] (2018-03-10)

### Added

- `fab main` (like `fab root`)

### Fixed

- threading bug running tests with new version of Jest

## [1.1.1] (2018-02-14)

### Removed

- colour output on Windows (because: PowerShell colours!)

## [1.1.0] (2017-11-05)

### Added

- shell command line completion

### Changed

- switched from Jasmine to Jest for tests

## [1.0.1] (2017-08-13)

### Added

- shrinkwrap

## 1.0.0 (2017-08-05)

- first stable release

[Unreleased]: https://github.com/JohnRGee/forest-arborist/compare/master...develop
[4.0.0]: https://github.com/JohnRGee/forest-arborist/compare/v3.3.0...v4.0.0
[3.3.0]: https://github.com/JohnRGee/forest-arborist/compare/v3.2.0...v3.3.0
[3.2.0]: https://github.com/JohnRGee/forest-arborist/compare/v3.1.1...v3.2.0
[3.1.1]: https://github.com/JohnRGee/forest-arborist/compare/v3.1.0...v3.1.1
[3.1.0]: https://github.com/JohnRGee/forest-arborist/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/JohnRGee/forest-arborist/compare/v2.0.0...v3.0.0
[2.0.0]: https://github.com/JohnRGee/forest-arborist/compare/v1.2.0...v2.0.0
[1.2.0]: https://github.com/JohnRGee/forest-arborist/compare/v1.1.2...v1.2.0
[1.1.2]: https://github.com/JohnRGee/forest-arborist/compare/1.1.1...v1.1.2
[1.1.1]: https://github.com/JohnRGee/forest-arborist/compare/v1.1.0...1.1.1
[1.1.0]: https://github.com/JohnRGee/forest-arborist/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/JohnRGee/forest-arborist/compare/v1.0.0...v1.0.1
