import { getLocaleConfig } from "src/i18n/config";
import { getMessages, getLocale } from "src/i18n/index";

function toDate(value: Date | number | string) {
	return value instanceof Date ? value : new Date(value);
}

function getFormatLocale() {
	return getLocaleConfig(getLocale()).formatLocale;
}

export function formatUiNumber(value: number, options?: Intl.NumberFormatOptions) {
	return new Intl.NumberFormat(getFormatLocale(), options).format(value);
}

export function formatUiDate(
	value: Date | number | string,
	options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }
) {
	return new Intl.DateTimeFormat(getFormatLocale(), options).format(toDate(value));
}

export function formatUiDateTime(
	value: Date | number | string,
	options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }
) {
	return new Intl.DateTimeFormat(getFormatLocale(), options).format(toDate(value));
}

export function formatUiTime(
	value: Date | number | string,
	options: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" }
) {
	return new Intl.DateTimeFormat(getFormatLocale(), options).format(toDate(value));
}

export function formatRelativeDateLabel(timestamp: number) {
	const messages = getMessages();
	const diffMs = Date.now() - timestamp;
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays <= 0) {
		return `${messages.common.today} ${formatUiTime(timestamp)}`;
	}

	if (diffDays === 1) {
		return `${messages.common.yesterday} ${formatUiTime(timestamp)}`;
	}

	return messages.common.daysAgo(formatUiNumber(diffDays));
}

export function formatRelativeDateShort(timestamp: number) {
	const messages = getMessages();
	const diffMs = Date.now() - timestamp;
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays <= 0) {
		return messages.common.today;
	}

	if (diffDays === 1) {
		return messages.common.yesterday;
	}

	return `${formatUiNumber(diffDays)} ${diffDays === 1 ? messages.common.day : messages.common.days}`;
}
