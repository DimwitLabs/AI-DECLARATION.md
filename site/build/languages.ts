/**
 * Language tags follow BCP 47 (RFC 5646).
 *
 * Canonical case is: lowercase language, Title-case script, UPPERCASE region --
 * e.g. `en`, `pt-BR`, `zh-Hans`. That canonical form is what belongs in the database
 * and in the HTML `lang` attribute. URLs stay lowercase (tags are case-insensitive),
 * so the two are derived separately rather than assumed equal.
 */

export function canonicalTag(raw: string): string {
  return raw
    .split('-')
    .map((part, i) => {
      if (i === 0) return part.toLowerCase();
      if (part.length === 4) return part[0].toUpperCase() + part.slice(1).toLowerCase();
      return part.toUpperCase();
    })
    .join('-');
}

export function urlSegment(tag: string): string {
  return tag.toLowerCase();
}

/** The language's own name for itself, from CLDR -- e.g. `ko` -> "한국어". */
export function displayName(tag: string): string {
  const name = new Intl.DisplayNames([tag], { type: 'language' }).of(tag) ?? tag;
  return name.charAt(0).toUpperCase() + name.slice(1);
}
