/**
 * Behavior is based on i18n-node
 * https://github.com/mashpie/i18n-node
 * @module i18n
 */
import { readdirSync, readFileSync } from 'fs';
import { join,  dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const localesPath = join(__dirname, 'locales');

let localizations = {};

const dirs = readdirSync(`${localesPath}`)
    .map(dirent => dirent);

for (const dir of dirs) {
    const files = readdirSync(`${localesPath}/${dir}`)
        .map(dirent => dirent);
    for (const file of files) {
        const locale = file.split('.')[0];
        const contents = readFileSync(`${localesPath}/${dir}/${file}`, 'utf8');
        const json = JSON.parse(contents);
        localizations[locale] = { ...localizations[locale], ...json };
    }
}

/**
 * @see {@link https://github.com/mashpie/i18n-node#i18n__ Reference}
 * @param {{ phrase: string, locale: string }} input - phrase to get localization for
 * @returns { string } localized phrase
 * @example
 * __({ phrase: 'Hello', locale: 'en-US' })
 */
function __({ phrase, locale }) {
    const translation = localizations[locale][phrase];
    return translation === undefined ? localizations['en-US'][phrase] : translation;
}

/**
 * @see {@link https://github.com/mashpie/i18n-node#i18n__mf Reference}
 * @param {{ phrase: string, locale: string }} input - phrase to get localization for
 * @param  { {} } replace - replacements for the phrase
 * @returns { string } localized phrase
 * @example
 * __mf({ phrase: 'Hello {name}', locale: 'en-US' }, { name: 'John' })
 */
function __mf({ phrase, locale }, replace) {
    let translation = __({ phrase: phrase, locale: locale });
    for (const[ key, value ] of Object.entries(replace)) {
        translation = translation.replace(`{${key}}`, value);
    }
    return translation;
}

/**
 * @see {@link https://github.com/mashpie/i18n-node#i18n__h Reference}
 * @param { string } phrase - phrase to get localization for
 * @returns list of objects of locales and localizations of `phrase`
 * @example
 * [{ en-US: 'NC' }, { es-ES: 'NC' }]
 */
function __h(phrase) {
    const phrases = [];
    for (const locale of Object.keys(localizations)) {
        const translation = __({ phrase: phrase, locale: locale });
        phrases.push({ [locale]: translation });
    }
    return phrases;
}

export default {
    __,
    __mf,
    __h
}