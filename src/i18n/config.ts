export const LOCALE_CODES = {
	ENGLISH: "en",
	SWEDISH: "sv",
} as const;

export type Locale = (typeof LOCALE_CODES)[keyof typeof LOCALE_CODES];

export const SUPPORTED_LOCALES = [LOCALE_CODES.ENGLISH, LOCALE_CODES.SWEDISH] as const;

export const DEFAULT_LOCALE: Locale = LOCALE_CODES.ENGLISH;
export const DEFAULT_LANGUAGE = "en" as const;
export const DEFAULT_REGION = "US" as const;

export const LOCALE_CONFIG = {
	[LOCALE_CODES.ENGLISH]: {
		language: DEFAULT_LANGUAGE,
		region: DEFAULT_REGION,
		formatLocale: `${DEFAULT_LANGUAGE}-${DEFAULT_REGION}`,
	},
	[LOCALE_CODES.SWEDISH]: {
		language: "sv",
		region: "SE",
		formatLocale: "sv-SE",
	},
} as const satisfies Record<Locale, { language: string; region: string; formatLocale: string }>;

export function isLocale(value: string): value is Locale {
	return SUPPORTED_LOCALES.includes(value as Locale);
}

export function getLocaleConfig(locale: Locale = DEFAULT_LOCALE) {
	return LOCALE_CONFIG[locale];
}
