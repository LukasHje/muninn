import type { LocaleMessages } from "i18n/locales/en";

type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends (...args: any[]) => any
		? T[K]
		: T[K] extends object
			? DeepPartial<T[K]>
			: T[K];
};

export const sv: DeepPartial<LocaleMessages> = {};
