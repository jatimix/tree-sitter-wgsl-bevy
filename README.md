tree-sitter-wgsl-bevy
=====================

<!-- [![discord][discord]](https://discord.gg/w7nTvsVJhm) -->
<!-- [![matrix][matrix]](https://matrix.to/#/#tree-sitter-chat:matrix.org) -->
<!-- [![npm][npm]](https://www.npmjs.com/package/tree-sitter-wgsl-bevy) -->
<!-- [![crates][crates]](https://crates.io/crates/tree-sitter-wgsl-bevy) -->
<!-- [![pypi][pypi]](https://pypi.org/project/tree-sitter-wgsl-bevy) -->

This is a extension of [tree-sitter-wgsl](https://github.com/szebniok/tree-sitter-wgsl) to support
the [Bevy Naga OIL](https://bevyengine.org/) preprocessor.

<!-- [ci]: https://img.shields.io/github/actions/workflow/status/tree-sitter-grammars/tree-sitter-wgsl-bevy/ci.yml?logo=github&label=CI -->
<!-- [discord]: https://img.shields.io/discord/1063097320771698699?logo=discord&label=discord -->
<!-- [matrix]: https://img.shields.io/matrix/tree-sitter-chat%3Amatrix.org?logo=matrix&label=matrix -->
<!-- [npm]: https://img.shields.io/npm/v/tree-sitter-wgsl-bevy?logo=npm -->
<!-- [crates]: https://img.shields.io/crates/v/tree-sitter-wgsl-bevy?logo=rust -->
<!-- [pypi]: https://img.shields.io/pypi/v/tree-sitter-wgsl-bevy?logo=pypi&logoColor=ffd242 -->

# Objective

The objective was to update the existing project which seems unmaintened. As I needed quite quickly a parser to work with [wgsl-bevy-ts-mode](https://github.com/jatimix/wgsl-bevy-ts-mode) which is a major editing mode for emacs. 

I expect the following to print '0':

``` shell
find ~/prog/bevy/ -name "*.wgsl" -exec tree-sitter parse {} \; | grep ERROR | wc -l
```

meaning: it parse 100% of bevy's wgsl code without any parse error.

# Known issues

Adding a string in a comment:

```
const a: f32 = 0.0;

// this is a comment with a string: "hellow"
fn fun() {

}
```

Will sadly makes syntax ERROR unrecoverable when the parser fail, and the whole buffer will be interpreted 
as a list of string. Which will make most syntax highlighter stop working until the syntax is fixed.

It's coming from the fact, that everything is a "string_content", whenever the scanner detect a double quote.

"string_content" is mostly used for "path import":

```
#import "path/to/a/shader/file.wgsl"::STUFF_TO_IMPORT
```

# Stuff to improve

Contribution welcome.

- [ ] I don't think it's fixable, but the grammar suffer from the same desease a the C one => it's impossible to correctly parse #ifdef without an actual pre-pass.
- [ ] Some improvements are actually WGSL standard spec improvement and not Bevy only. But I didn't want to update the main WGSL grammar, so I overwrite some things which could be ported back into the main WGSL grammar this grammar is based upon.
- [ ] I reused '_import_path_' quite a lots instead of creating a "identifier::identifier::*", which make it difficult for syntax highlight and function call.
- [ ] _import_path_ + _import_list_, is junky but functionnal. Might need to make a better tree here.
- [ ] Function call and type Declaration is the same node, which make formatting kindda ugly.


