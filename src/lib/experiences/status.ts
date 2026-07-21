export const experienceStatusOrder = ["considered", "owned", "archived"] as const;

export type ExperienceStatus = (typeof experienceStatusOrder)[number];

const experienceStatusColors: Record<ExperienceStatus, string> = {
	considered: "#E7B375",
	owned: "#AABD9A",
	archived: "#B8B3A8",
};

function normalizeStatusValue(value?: string | null) {
	return value?.trim().toLocaleLowerCase("en") ?? "";
}

export function getCanonicalExperienceStatus(value?: string | null) {
	const normalizedValue = normalizeStatusValue(value);

	if (!normalizedValue) {
		return null;
	}

	if (normalizedValue === "wishlist" || normalizedValue === "considered") {
		return "considered";
	}

	if (normalizedValue === "owned" || normalizedValue === "active") {
		return "owned";
	}

	if (normalizedValue === "archived" || normalizedValue === "retired") {
		return "archived";
	}

	return normalizedValue;
}

export function isExperienceStatus(value: string): value is ExperienceStatus {
	return experienceStatusOrder.includes(value as ExperienceStatus);
}

export function getExperienceStatusColor(value?: string | null) {
	const canonicalStatus = getCanonicalExperienceStatus(value);
	return canonicalStatus && isExperienceStatus(canonicalStatus)
		? experienceStatusColors[canonicalStatus]
		: undefined;
}

export function getExperienceStatusIndex(value: string) {
	const canonicalStatus = getCanonicalExperienceStatus(value);
	return canonicalStatus ? experienceStatusOrder.indexOf(canonicalStatus as ExperienceStatus) : -1;
}
