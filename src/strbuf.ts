/*
 * v8 strings are limited to 12 bytes; longer strings are actually implemented
 * as ConsStrings. In order to generate very large strings quickly, it is then
 * important to observe that 12 byte boundary to prevent intermediate string
 * fragments from being generated as ConsStrings themselves.
 */
const align = 12;

export function builder(initial?: string) {
  let major = '';
  let minor = '';

  if (initial !== undefined) {
    major = initial;
  }

  return {
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

    getbuffer: function(): string {
      if (minor) {
        major += minor;
        minor = '';
      }

      return major;
    },
  };
}
