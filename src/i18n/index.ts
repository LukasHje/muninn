import { DEFAULT_LOCALE, type Locale, getLocaleConfig, LOCALE_CODES } from "src/i18n/config";
import { en, type LocaleMessages } from "src/i18n/locales/en";
import { sv } from "src/i18n/locales/sv";

export { DEFAULT_LANGUAGE, DEFAULT_LOCALE, DEFAULT_REGION, type Locale } from "src/i18n/config";

type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends (...args: any[]) => any
		? T[K]
		: T[K] extends object
			? DeepPartial<T[K]>
			: T[K];
};

type Join<K extends string, P extends string> = `${K}.${P}`;

type LeafTranslationKey<T> = {
	[K in keyof T & string]: T[K] extends (...args: any[]) => any
		? K
		: T[K] extends object
			? Join<K, LeafTranslationKey<T[K]>>
			: K;
}[keyof T & string];

type TranslationValue<T, K extends string> = K extends `${infer Head}.${infer Tail}`
	? Head extends keyof T
		? TranslationValue<T[Head], Tail>
		: never
	: K extends keyof T
		? T[K]
		: never;

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeMessages<T extends Record<string, unknown>>(base: T, overrides: DeepPartial<T> | undefined): T {
	if (!overrides) {
		return base;
	}

	const merged = { ...base } as Record<string, unknown>;

	for (const [key, baseValue] of Object.entries(base)) {
		const overrideValue = overrides[key as keyof T];
		if (overrideValue === undefined) {
			merged[key] = baseValue;
			continue;
		}

		if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
			merged[key] = mergeMessages(baseValue, overrideValue);
			continue;
		}

		merged[key] = overrideValue;
	}

	return merged as T;
}

const localeMessages: Record<Locale, LocaleMessages> = {
	[LOCALE_CODES.ENGLISH]: en,
	[LOCALE_CODES.SWEDISH]: mergeMessages(en, sv),
};

let activeLocale: Locale = DEFAULT_LOCALE;

export type TranslationKey = LeafTranslationKey<LocaleMessages>;

function resolveTranslation<K extends TranslationKey>(
	messages: LocaleMessages,
	key: K
): TranslationValue<LocaleMessages, K> {
	const resolved = key
		.split(".")
		.reduce<unknown>((value, segment) => (isPlainObject(value) ? value[segment] : undefined), messages);

	return resolved as TranslationValue<LocaleMessages, K>;
}

export function getLocale() {
	return activeLocale;
}

export function setLocale(locale: Locale) {
	activeLocale = localeMessages[locale] ? locale : DEFAULT_LOCALE;
}

export function getMessages(locale: Locale = getLocale()) {
	return localeMessages[locale] ?? localeMessages[DEFAULT_LOCALE];
}

export function getLanguage(locale: Locale = getLocale()) {
	return getLocaleConfig(locale).language;
}

export function t<K extends TranslationKey>(key: K, locale: Locale = getLocale()) {
	return resolveTranslation(getMessages(locale), key);
}

export const ui = new Proxy({} as LocaleMessages, {
	get(_target, property, receiver) {
		return Reflect.get(getMessages(), property, receiver);
	},
}) as LocaleMessages;

export function withSiteName(pageLabel: string) {
	return `${pageLabel} | ${t("meta.siteName")}`;
}
