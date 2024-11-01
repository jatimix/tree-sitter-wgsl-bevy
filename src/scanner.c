#include <tree_sitter/parser.h>
#include <wctype.h>

enum TokenType {
	BLOCK_COMMENT,
	STRING_CONTENT
};

void *tree_sitter_wgsl_bevy_external_scanner_create() {
	return NULL;
}
void tree_sitter_wgsl_bevy_external_scanner_destroy(void *p) {}
void tree_sitter_wgsl_bevy_external_scanner_reset(void *p) {}
unsigned int tree_sitter_wgsl_bevy_external_scanner_serialize(void *p, char *buffer) {
	return 0;
}
void tree_sitter_wgsl_bevy_external_scanner_deserialize(void *p, const char *b, unsigned n) {}

static void advance(TSLexer *lexer) {
	lexer->advance(lexer, false);
}

static bool at_eof(TSLexer *lexer) {
	return lexer->eof(lexer);
}

static inline bool process_string(TSLexer *lexer) {
    bool has_content = false;
    for (;;) {
        if (lexer->lookahead == '\"' || lexer->lookahead == '\\') {
			break;
        }
        if (lexer->eof(lexer)) {
            return false;
        }
        has_content = true;
        advance(lexer);
    }
	//if (has_content) advance(lexer);
    lexer->result_symbol = STRING_CONTENT;
    lexer->mark_end(lexer);
    return has_content;
}

// based on https://github.com/tree-sitter/tree-sitter-rust/blob/f7fb205c424b0962de59b26b931fe484e1262b35/src/scanner.c
bool tree_sitter_wgsl_bevy_external_scanner_scan(
	void *payload,
	TSLexer *lexer,
	const bool *valid_symbols
) {
	if (valid_symbols[STRING_CONTENT]) {
        return process_string(lexer);
    }

	while (iswspace(lexer->lookahead)) {
		lexer->advance(lexer, true);
	}

	if (lexer->lookahead != '/') {
		return false;
	}
	advance(lexer);

	if (lexer->lookahead != '*') {
		return false;
	}
	advance(lexer);

	unsigned int comment_depth = 1;
	while (true) {
		if (lexer->lookahead == '/') {
			advance(lexer);

			if (lexer->lookahead == '*') {
				advance(lexer);
				comment_depth += 1;
			}
		} else if (lexer->lookahead == '*') {
			advance(lexer);

			if (lexer->lookahead == '/') {
				advance(lexer);
				comment_depth -= 1;
				
				if (comment_depth == 0) {
					lexer->result_symbol = BLOCK_COMMENT;
					return true;
				}
			}
		} else if (at_eof(lexer)) {
			return false;
		} else {
			advance(lexer);
		}
	}
}
