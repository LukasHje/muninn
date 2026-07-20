import type { LibraryItem } from "src/lib/vault";
import { getExperienceDefinitions } from "src/lib/experiences/registry";
import { getExperienceNotes } from "src/lib/experiences/selectors";

export interface SidebarExperienceLink {
	label: string;
	href: string;
	count: number;
	icon: string;
}

export function buildSidebarExperienceLinks(items: LibraryItem[]): SidebarExperienceLink[] {
	return getExperienceDefinitions().map((definition) => ({
		label: definition.sidebar.label,
		href: definition.href,
		count: getExperienceNotes(items, definition).length,
		icon: definition.icon,
	}));
}
