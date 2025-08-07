import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const defaultI18nNamespaces = [
  'common',
  'auth',
  'account',
  'teams',
  'billing',
  'marketing',
];

export type TranslationData = {
  [key: string]: string | TranslationData;
};

export type Translations = {
  [locale: string]: {
    [namespace: string]: TranslationData;
  };
};

export async function loadTranslations() {
  const localesPath = join(process.cwd(), '../web/public/locales');
  const locales = readdirSync(localesPath);
  const translations: Translations = {};

  for (const locale of locales) {
    translations[locale] = {};

    for (const namespace of defaultI18nNamespaces) {
      try {
        const filePath = join(localesPath, locale, `${namespace}.json`);
        const content = readFileSync(filePath, 'utf8');
        translations[locale][namespace] = JSON.parse(content);
      } catch (error) {
        console.warn(
          `Warning: Translation file not found for locale "${locale}" and namespace "${namespace}"`,
        );
        translations[locale][namespace] = {};
      }
    }
  }

  return translations;
}
