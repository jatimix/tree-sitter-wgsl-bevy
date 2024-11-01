const WGSL = require("tree-sitter-wgsl/grammar")

module.exports = grammar(WGSL, {
    name: 'wgsl_bevy',

    conflicts: $ => [
        [$.type_declaration, $.import_path],
        [$._expression, $.import_path],
        [$._expression, $.preproc_ifdef],
        [$._expression, $.preproc_ifdef_in_struct_declaration],
        [$._expression, $.preproc_ifdef_in_statement],
        [$._expression, $.preproc_ifdef_in_param_list],
        [$._expression, $.preproc_ifdef_in_argument],
        [$._expression, $.preproc_ifdef_before_else],
        [$.parameter_list],
        [$._expression, $.type_declaration, $.import_path],
        // [$.composite_value_decomposition_expression, $.import_path]
        [$.preproc_ifdef_in_struct_declaration],
        [$._declaration, $.preproc_ifdef],
        [$._statement, $.preproc_ifdef_in_statement],
        [$.if_statement],

    ],

    externals: ($, original) => [
        $.block_comment,
        $.string_content,
    ],

    rules: {
        _declaration: ($, original) => choice(
            $.preproc_import,
            $.define_import_path,
            $.preproc_ifdef,
            $.define_preproc,
            original,
        ),

        _statement: ($, original) => choice(
            $.preproc_import,
            alias($.preproc_ifdef_in_statement, $.preproc_ifdef),
            $.type_constructor_or_function_call_expression,
            original,
            ';' // support empty statement
        ),

        global_constant_declaration: ($, original) => choice(
            original,
            // seq("const", choice($.identifier, $.variable_identifier_declaration), "=", $.const_expression),
            seq("const", choice($.identifier, $.variable_identifier_declaration), "=", $._expression),
        ),

        preproc_literal: $ => seq("#", optional("{"), $.identifier, /}[iuf]?/),

        type_declaration: ($, original) => choice(
            original,
            $.import_path,
            //doubleColonSep1($.identifier),
            seq(
                "array",
                optional(
                    seq(
                        "<",
                        $.type_declaration,
                        optional(seq(",", choice($.int_literal, $.identifier, $.preproc_literal))),
                        ">"
                       )
                ),
            ),
            seq(
                choice("binding_array", "texture_storage_2d", "atomic"),
                "<",
                $.type_declaration,
                optional(seq(",", choice($.int_literal, $.identifier, $.preproc_literal))),
                ">"
            ),
        ),

        // WGSL not bevy specific
        address_space: ($, original) => choice(original, "push_constant"),

        //overwrite
        function_declaration: $ => seq(
            optional("virtual"),
            optional("override"),
            field("attribute", repeat($.attribute)),
            "fn",
            field("name", $.import_path),
            "(",
            repeat(choice(
                $.preproc_ifdef_in_param_list,
                field("parameters", $.parameter_list)
            )),
            ")",
            field("type", optional($.function_return_type_declaration)),
            field("body", $.compound_statement)
        ),

        struct_declaration: $ => seq(
            "struct",
            field("name", $.identifier),
            "{",
            $._struct_declaration_content,
            "}"
        ),

        variable_statement: ($, original) => choice(
            original,
            seq(
                $.type_declaration,
                choice(
                    $.identifier,
                    $.variable_identifier_declaration
                ),
                "=",
                $._expression,
            )
        ),

        _struct_declaration_content: $ => seq(
            repeat(choice(seq($.struct_member, ","), $.preproc_import, alias($.preproc_ifdef_in_struct_declaration, $.preproc_ifdef))),
            choice($.struct_member, $.preproc_import, alias($.preproc_ifdef_in_struct_declaration, $.preproc_ifdef)),
            optional(",")),

        argument_list_expression: $ => seq(
            "(",
            optional(seq(
                repeat(
                    choice(
                        seq($._expression, ","),
                        $.preproc_ifdef_in_argument,
                    )
                ),
                choice(
                    seq($._expression, optional(",")),
                    $.preproc_ifdef_in_argument,
                ),
            )),
            ")"
        ),

        import_list: $ => seq(
            // '{',
            commaSep1(
                seq(field('path', choice(
                    $.import_path,
                )),
                optional(field("alias", $.alias)))
            ),

            optional(','),
            '}',
        ),

        _expression: ($, original) => choice(
            original,
            $.preproc_literal,
            doubleColonSep1($.identifier),
        ),

        preproc_import: $ => seq(
            preprocessor('import'),
            field('path', $.import_path),
            optional(choice(commaSep1($.identifier), field("alias", $.alias))),
            optional(";"),
            '\n'
        ),
        define_import_path: $ => seq(
            preprocessor('define_import_path'),
            field('path', choice(
                $.import_path,
            )),
            '\n'
        ),
        define_preproc: $ => seq(preprocessor('define'), $.identifier),

        string_path: $ => seq(
            '"',
            repeat($.string_content),
            '"'
        ),

        // add 'l
        int_literal: $ => /(-?0[xX][0-9a-fA-F]+|0|-?[1-9][0-9]*)[iul]*/,

        attribute: ($, original) => choice(
            original,
            seq(
                "@",
                $.identifier,
                optional(
                    seq(
                        "(",
                        optional("#"),
                        repeat(seq($._literal_or_identifier, ",")),
                        $._literal_or_identifier,
                        optional(","),
                        ")"
                    )
                )
            ),
        ),

        import_path: $ => doubleColonSep1(seq(
            choice($.identifier, $.string_path),
            optional(seq('::{', $.import_list))
        )),
        alias: $ => seq('as', $.identifier),

        if_statement: $ => seq(
            "if",
            field("condition", $._expression),
            field("consequence", $.compound_statement),
            choice(
                optional(seq("else", field("alternative", $.else_statement))),
                optional($.preproc_ifdef_before_else),
            ),
        ),
        parenthesized_expression: ($) => seq(
            "(",
            choice($._expression, $.preproc_ifdef_in_argument),
            ")"
        ),

        ...preprocIf('', $ => $._declaration),
        ...preprocIf('_before_else', $ => seq("else", field("alternative", $.else_statement))),
        ...preprocIf('_in_statement', $ => $._statement),
        ...preprocIf('_in_param_list', $ => $.parameter_list),
        ...preprocIf('_in_argument', $ => seq($._expression, optional(","))),
        ...preprocIf('_in_struct_declaration', $ => seq(
                     choice($.struct_member,
                            $.preproc_import,
                            alias($.preproc_ifdef_in_struct_declaration,
                                  $.preproc_ifdef)),
            optional(","))),
    }
});

// from tree-sitter-c
function preprocessor(command) {
    return alias(new RegExp('#[ \t]*' + command), '#' + command)
}

// from tree-sitter-c
function preprocIf(suffix, content) {
    function elseBlock($) {
        return seq(
            suffix ? alias($['preproc_else' + suffix], $.preproc_else) : $.preproc_else,
        );
    }

    return {
        ['preproc_ifdef' + suffix]: $ => seq(
            choice(preprocessor('ifdef'), preprocessor('ifndef'), preprocessor('if')),
            field('name', choice($.identifier, $.const_literal, $._expression)), "\n",
            repeat(choice(content($), $['preproc_ifdef' + suffix])),
            field('alternative', optional(
                choice(
                          elseBlock($),
                          seq(preprocessor('else'), $['preproc_bevy_elif' + suffix])
                      )
                  )
            ),
            preprocessor('endif'),
        ),

        ['preproc_bevy_elif' + suffix]: $ => seq(
            choice('ifdef', 'ifndef'),
            field('name', $.identifier),
            repeat(choice(content($), $['preproc_ifdef' + suffix])),
            field('alternative', optional(
                choice(
                    elseBlock($),
                    seq(preprocessor('else'), $['preproc_bevy_elif' + suffix])
                )
              )
            ),
        ),

        ['preproc_else' + suffix]: $ => seq(
            preprocessor('else'),
            '\n',
            repeat(content($)),
        ),
    }
}

function doubleColonSep1(rule) {
    return seq(rule, repeat(seq('::', rule)))
}

function commaSep1(rule) {
    return seq(rule, repeat(seq(',', rule)))
}
