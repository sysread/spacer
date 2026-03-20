/**
 * strbuf - chunked string builder optimized for V8's string representation.
 *
 * V8 interns strings up to 12 bytes as flat SeqStrings. Longer strings become
 * ConsStrings (a linked tree of fragments), which are efficient to build but
 * slow to flatten for output. Naive repeated concatenation of small fragments
 * causes intermediate ConsString chains that degrade performance.
 *
 * This builder flushes the minor (accumulation) buffer into the major buffer
 * at 12-byte boundaries, keeping fragments at a size V8 handles as flat
 * strings. Used by svgpath to build SVG path strings from many small tokens.
 */

const align = 12;

/**
 * Returns a string builder with append() and getbuffer() methods.
 * @param initial - optional starting content for the buffer
 */
export function builder(initial?: string) {
  let major = '';
  let minor = '';

  if (initial !== undefined) {
    major = initial;
  }

  return {
    /** Appends str to the buffer, flushing minor to major at the alignment boundary. */
    append: function(str: string|number): void {
      if (minor.length + (<string>str).length > align) {
        major += minor;
        minor = '';
      }

      minor += str;

      if (minor.length >= align) {
        major += minor;
        minor = '';
      }
    },

    /** Flushes any remaining minor buffer and returns the complete string. */
    getbuffer: function(): string {
      if (minor) {
        major += minor;
        minor = '';
      }

      return major;
    },
  };
}
