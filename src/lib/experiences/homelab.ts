import { getMetadataIcon } from "src/lib/experiences/metadataIcons";
import { getExperienceMetadataEntries, getNoteMetadataValue, getNoteMetadataValues, type ExperienceMetadataEntry } from "src/lib/experiences/selectors";
import { formatOperatingSystem } from "src/lib/os-registry";
import type { LibraryItem } from "src/lib/vault";

export type HomelabCardKind = "node" | "service" | "documentation" | "specification" | "dashboard";
export type HomelabEntity =
	| "server"
	| "nas"
	| "workstation"
	| "mini-pc"
	| "router"
	| "switch"
	| "vm"
	| "raspberry-pi"
	| "display"
	| "ups"
	| "part"
	| "service"
	| "dashboard"
	| "documentation"
	| "specification";
export type HomelabLifecycle = "current" | "planned" | "to-upgrade" | "archived";
export type HomelabOperationalStatus = "active" | "offline" | "maintenance" | "planned" | "retired" | "archived";
export type HomelabNodeCategory = "server" | "nas" | "raspberry-pi" | "router" | "switch" | "vm" | "workstation";
export type HomelabServiceCategory =
	| "applications"
	| "media"
	| "utilities"
	| "monitoring"
	| "networking"
	| "storage"
	| "development"
	| "automation"
	| "security"
	| "infrastructure"
	| "other";

export interface HomelabClassification {
	entity: HomelabEntity;
	lifecycle: HomelabLifecycle | null;
	operationalStatus: HomelabOperationalStatus | null;
	cardKind: HomelabCardKind;
}

export interface HomelabItem extends HomelabClassification {
	title: string;
	subtitle: string | null;
	placement: string | null;
	hostname: string | null;
	platform: string | null;
	os: string | null;
	cpu: string | null;
	ram: string | null;
	storage: string | null;
	network: string | null;
	technologies: string[];
}

export interface HomelabCardFact {
	label: string;
	value: string;
	icon: string;
	assetIcon?: string;
}

export interface HomelabCardPresentation {
	kind: HomelabCardKind;
	title: string;
	subtitle: string | null;
	status: string | null;
	icon: string;
	facts: HomelabCardFact[];
	footerPrimary: string;
	description: string | null;
	tags: string[];
}

export interface HomelabRelationItem { title: string; href: string; kind: HomelabCardKind }
export interface HomelabRelationGroup { label: string; items: HomelabRelationItem[] }

const nodeTypes = new Set([
	"server", "nas", "workstation", "mini-pc", "router", "switch", "vm", "raspberry-pi",
]);
const partTypes = new Set(["part", "cpu", "processor", "ram", "memory", "ssd", "hdd", "disk", "psu", "nic", "fan", "motherboard", "hba", "gpu"]);

function normalized(value: string) {
	return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en");
}

function frontmatterFirst(note: LibraryItem, ...keys: string[]) {
	for (const key of keys) {
		const raw = note.frontmatter[key];
		const explicit = Array.isArray(raw) ? raw.find((value) => value?.trim()) : raw;
		if (explicit?.trim()) return explicit.trim().replace(/^\[\[|\]\]$/g, "").replace(/\|.*$/, "");
	}
	return null;
}

function first(note: LibraryItem, ...keys: string[]) {
	const explicit = frontmatterFirst(note, ...keys);
	if (explicit) return explicit;
	for (const key of keys) {
		const value = getNoteMetadataValue(note, key);
		if (value) return value.replace(/^\[\[|\]\]$/g, "").replace(/\|.*$/, "");
	}
	return null;
}

function compact(value: string | null, max = 31) {
	if (!value) return null;
	const clean = value.replace(/\[\[|\]\]/g, "").replace(/\s+/g, " ").trim();
	return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

function rawValues(note: LibraryItem, ...keys: string[]) {
	for (const key of keys) {
		const raw = note.frontmatter[key];
		const values = (Array.isArray(raw) ? raw : raw ? [raw] : [])
			.map((value) => value.trim())
			.filter(Boolean);
		if (values.length > 0) return values;
	}
	return [];
}

const coreWords: Record<string, number> = { single: 1, dual: 2, quad: 4, hexa: 6, octa: 8 };
const knownCpuCoreCounts: Array<[RegExp, number]> = [
	[/\bIntel Core i5[- ]?8600K\b/i, 6],
	[/\bIntel Core i5[- ]?9600K\b/i, 6],
	[/\bIntel Core i5[- ]?14500\b/i, 14],
	[/\bIntel Core i7[- ]?14700K\b/i, 20],
	[/\bAMD Ryzen 5 5600\b/i, 6],
];

export function formatHomelabCpu(value: string | null) {
	if (!value) return null;
	const text = value.replace(/[-_]/g, " ");
	const numeric = text.match(/\b(\d{1,3})\s*(?:cores?|c(?:\s*\/\s*\d+\s*t)?\b)/i);
	if (numeric) return `${Number(numeric[1])} ${Number(numeric[1]) === 1 ? "core" : "cores"}`;
	const word = text.match(/\b(single|dual|quad|hexa|octa)[ -]?cores?\b/i);
	if (word) return `${coreWords[word[1].toLocaleLowerCase("en")]} cores`;
	// Ryzen 7 is consistently the eight-core tier. This also covers planned
	// alternatives such as "AMD Ryzen 7 or Intel i7", where i7 alone is too
	// broad to infer but the explicit Ryzen tier provides a useful target.
	if (/\bAMD\s+Ryzen\s+7\b/i.test(value)) return "8 cores";
	const knownModel = knownCpuCoreCounts.find(([pattern]) => pattern.test(value));
	if (knownModel) return `${knownModel[1]} cores`;
	if (/\b(?:tbd|n\/?a|unknown|not specified)\b/i.test(value)) return "TBD";
	return compact(value.replace(/\s*@\s*[\d.]+\s*GHz.*$/i, "").replace(/\s*\([^)]*\)\s*$/, ""), 24);
}

export function formatHomelabMemory(value: string | null) {
	if (!value) return null;
	const match = value.match(/(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*(TB|GB|MB)\b/i);
	if (!match) return "TBD";
	const amount = Number((match[2] ?? "0").replace(",", ".")) * Number(match[1] ?? "1");
	return `${Number.isInteger(amount) ? amount : amount.toFixed(1)}${match[3].toUpperCase()}`;
}

export function formatHomelabStorage(values: string[]) {
	if (values.length === 0) return null;
	let totalGb = 0;
	for (const value of values) {
		for (const match of value.matchAll(/(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*(TB|GB)\b/gi)) {
			const count = Number(match[1] ?? "1");
			const amount = Number(match[2].replace(",", "."));
			totalGb += count * amount * (match[3].toUpperCase() === "TB" ? 1000 : 1);
		}
	}
	if (totalGb >= 1000) {
		const terabytes = totalGb / 1000;
		return `${Number.isInteger(terabytes) ? terabytes : terabytes.toFixed(1)} TB`;
	}
	if (totalGb > 0) return `${totalGb} GB`;
	return "TBD";
}

export function formatHomelabNetwork(value: string | null) {
	if (!value) return null;
	const speeds = [...value.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:GbE|Gbit(?:\/s)?|Gbps|Gigabit Ethernet)/gi)]
		.map((match) => Number(match[1].replace(",", ".")));
	if (/\bGigabit Ethernet\b/i.test(value)) speeds.push(1);
	if (speeds.length > 0) return `${Math.max(...speeds)} GbE`;
	const wifi = value.match(/Wi[ -]?Fi\s*(\d(?:E)?)/i);
	return wifi ? `Wi-Fi ${wifi[1]}` : "TBD";
}

function formatHomelabOs(value: string | null) {
	if (!value) return null;
	const known = value.match(/^(TrueNAS SCALE|TrueNAS|Raspberry Pi OS|Ubuntu(?: Server)?|Debian|CachyOS|OPNsense|Proxmox|Windows \d+)/i);
	return compact(known?.[1] ?? value, 20);
}

function normalizeEntity(value: string | null): HomelabEntity | null {
	const entity = normalized(value ?? "").replace(/[ _]+/g, "-");
	const aliases: Record<string, HomelabEntity> = {
		server: "server", node: "server", "ai-node": "server", "ai-system": "server",
		nas: "nas", storage: "nas", workstation: "workstation", desktop: "workstation", "dev-station": "workstation", laptop: "workstation",
		"mini-pc": "mini-pc", minipc: "mini-pc", router: "router", firewall: "router", switch: "switch",
		vm: "vm", "virtual-machine": "vm", "raspberry-pi": "raspberry-pi", rpi: "raspberry-pi",
		display: "display", monitor: "display", ups: "ups", service: "service", application: "service",
		dashboard: "dashboard", documentation: "documentation", document: "documentation", governance: "documentation", note: "documentation", reference: "documentation",
		specification: "specification", spec: "specification",
	};
	if (partTypes.has(entity)) return "part";
	return aliases[entity] ?? null;
}

function isServiceRoot(note: LibraryItem) {
	const parts = note.relativePath.split("/");
	return parts.length === 3 || (/^index\.md$/i.test(parts.at(-1) ?? "") && (parts.length === 4 || /overview/i.test(parts.at(-2) ?? "")));
}

function inferEntity(note: LibraryItem): HomelabEntity {
	const explicit = normalizeEntity(frontmatterFirst(note, "entity", "type"));
	if (explicit) return explicit;
	const path = normalized(note.relativePath);
	const filename = normalized(note.relativePath.split("/").at(-1) ?? note.title);
	const signal = normalized(`${note.title} ${first(note, "category", "role") ?? ""} ${note.content.slice(0, 1600)}`);
	if (/parts.database/.test(path)) return "part";
	if (/\bmonitor\b|\bdisplay\b/.test(`${filename} ${signal}`)) return "display";
	if (/\bups\b|uninterruptible power/.test(`${filename} ${signal}`)) return "ups";
	if (/\b(hba|nic|motherboard|processor|cpu|ram|memory|ssd|hdd|disk|psu|fan|gpu)\b/.test(filename)) return "part";
	if (!/(?:^|\/)07\.99 inspo\//.test(path) && (/dashboard|diagram|rack layout|network overview|infrastructure overview|inventory|topology|\bpad\b/.test(filename))) return "dashboard";
	if (/\/07\.02 services\//.test(path)) return isServiceRoot(note) ? "service" : "documentation";
	if (/\bnas\b|truenas|network attached storage/.test(signal)) return "nas";
	if (/raspberry|\brpi\b/.test(signal)) return "raspberry-pi";
	if (/\bmini[ -]?pc\b|\bnuc\b/.test(signal)) return "mini-pc";
	if (/workstation|desktop|dev[ -]?station|laptop/.test(signal)) return "workstation";
	if (/\brouter\b|firewall|opnsense|mikrotik/.test(signal)) return "router";
	if (/\bswitch\b/.test(signal)) return "switch";
	if (/virtual machine|\bvm\b|proxmox guest/.test(signal)) return "vm";
	if (first(note, "hostname") || (first(note, "cpu") && first(note, "ram"))) return "server";
	if (/spec(?:ification)?[-_ ]?sheet|hardware spec/.test(filename)) return "specification";
	return "documentation";
}

function normalizeLifecycle(value: string | null): HomelabLifecycle | null {
	const lifecycle = normalized(value ?? "").replace(/[ _]+/g, "-");
	if (["current", "active"].includes(lifecycle)) return "current";
	if (["planned", "plan"].includes(lifecycle)) return "planned";
	if (["to-upgrade", "upgrade"].includes(lifecycle)) return "to-upgrade";
	if (["archived", "archive", "retired"].includes(lifecycle)) return "archived";
	return null;
}

function inferLifecycle(note: LibraryItem): HomelabLifecycle | null {
	const explicit = normalizeLifecycle(frontmatterFirst(note, "lifecycle"));
	if (explicit) return explicit;
	const path = normalized(note.relativePath).replace(/_/g, " ");
	if (/(?:^|\/)07\.05\.03 to upgrade(?:\/|$)|(?:^|\/)to upgrade(?:\/|$)/.test(path)) return "to-upgrade";
	if (/(?:^|\/)07\.05\.99 archived specs(?:\/|$)|(?:^|\/)(?:archived specs|archived)(?:\/|$)/.test(path)) return "archived";
	if (/(?:^|\/)07\.05\.02 planned(?:\/|$)|(?:^|\/)planned(?:\/|$)/.test(path)) return "planned";
	if (/(?:^|\/)07\.05\.01 current(?:\/|$)|(?:^|\/)current(?:\/|$)/.test(path)) return "current";
	return null;
}

function normalizeOperationalStatus(value: string | null, entity: HomelabEntity): HomelabOperationalStatus | null {
	const status = normalized(value ?? "").replace(/[ _]+/g, "-");
	if (["active", "online", "running", "up"].includes(status)) return "active";
	if (["offline", "down", "stopped"].includes(status)) return "offline";
	if (["maintenance", "servicing"].includes(status)) return "maintenance";
	if (["retired", "deprecated"].includes(status)) return "retired";
	if (status === "archived") return "archived";
	if (status === "planned") return "planned";
	if (status === "owned" && entity !== "service") return "active";
	return null;
}

function inferOperationalStatus(note: LibraryItem, entity: HomelabEntity, lifecycle: HomelabLifecycle | null) {
	const explicitStatus = first(note, "status");
	if (explicitStatus) return normalizeOperationalStatus(explicitStatus, entity);
	if (lifecycle === "planned") return "planned";
	if (lifecycle === "archived") return "archived";
	if (lifecycle === "to-upgrade") return "maintenance";
	if (lifecycle === "current") return "active";
	return null;
}

function cardKindForEntity(entity: HomelabEntity): HomelabCardKind {
	if (nodeTypes.has(entity)) return "node";
	if (entity === "service") return "service";
	if (["display", "ups", "part", "specification"].includes(entity)) return "specification";
	if (entity === "dashboard") return "dashboard";
	return "documentation";
}

export function getHomelabClassification(note: LibraryItem): HomelabClassification {
	const entity = inferEntity(note);
	const lifecycle = inferLifecycle(note);
	return { entity, lifecycle, operationalStatus: inferOperationalStatus(note, entity, lifecycle), cardKind: cardKindForEntity(entity) };
}

export function getHomelabCardKind(note: LibraryItem) {
	return getHomelabClassification(note).cardKind;
}

const homelabStatusColors: Record<string, string> = {
	active: "#6C8061",
	owned: "#6C8061",
	planned: "#657986",
	maintenance: "#B38A55",
	offline: "#D88B87",
	archived: "#8A8F98",
	retired: "#8A8F98",
};

export function getHomelabInspectorMetadataEntries(note: LibraryItem, keys: string[]) {
	const status = getHomelabClassification(note).operationalStatus;
	return keys.flatMap((key): ExperienceMetadataEntry[] => {
		if (key !== "status") return getExperienceMetadataEntries(note, [key]);
		if (!status) return [];
		return [{
			key: "status",
			label: "Status",
			value: titleCase(status),
			icon: { ...getMetadataIcon("status", status), color: homelabStatusColors[status] },
		}];
	});
}

function inferTechnologies(note: LibraryItem) {
	const source = normalized(`${note.relativePath} ${note.title} ${note.content.slice(0, 2500)}`);
	const known = ["Docker", "TrueNAS", "Linux", "Grafana", "Prometheus", "Kubernetes", "k3s", "Pi-hole", "Jellyfin", "Cloudflare", "GitOps", "Raspberry Pi"];
	return known.filter((technology) => source.includes(normalized(technology)));
}

function getHomelabServiceName(note: LibraryItem) {
	const parts = note.relativePath.split("/");
	const fileName = parts.at(-1)?.replace(/\.md$/i, "") || note.title;
	const genericIndex = /^(?:index|overview|service|readme)$/i.test(fileName.trim());
	const identity = genericIndex ? parts.at(-2) ?? note.title : note.title || fileName;
	return identity
		.replace(/\s+(?:diagram|overview|index|configuration)$/i, "")
		.replace(/^\d+(?:\.\d+)*\s+/, "")
		.trim();
}

export function getHomelabServiceCategory(note: LibraryItem): HomelabServiceCategory | null {
	if (getHomelabClassification(note).entity !== "service") return null;
	const explicit = first(note, "service_category", "category");
	if (explicit) {
		const category = normalized(explicit).replace(/\s+/g, "-");
		if (["application", "applications", "self-hosted-application", "self-hosted-applications"].includes(category)) return "applications";
		if (["generic", "generic-service", "uncategorized"].includes(category)) return "other";
		const supported: HomelabServiceCategory[] = ["applications", "media", "utilities", "monitoring", "networking", "storage", "development", "automation", "security", "infrastructure", "other"];
		if (supported.includes(category as HomelabServiceCategory)) return category as HomelabServiceCategory;
	}
	const signal = normalized(`${getHomelabServiceName(note)} ${note.title} ${note.tags.join(" ")} ${note.content.slice(0, 1200)}`);
	if (/immich|jellyfin|plex|emby|photoprism|media server|teamspeak/.test(signal)) return "media";
	if (/nextcloud|paperless|hoarder|linkding|freshrss|bookstack|outline|vikunja/.test(signal)) return "applications";
	if (/pi[ -]?hole|adguard|homepage|dashboard|uptime kuma|vaultwarden/.test(signal)) return "utilities";
	if (/grafana|prometheus|exporter|monitoring|metrics|loki|alertmanager/.test(signal)) return "monitoring";
	if (/truenas|zfs|storage|backup|minio/.test(signal)) return "storage";
	if (/cloudflare|reverse proxy|nginx|traefik|dns|dhcp|network|vpn|wireguard/.test(signal)) return "networking";
	if (/muninn|forgejo|gitea|gitlab|jenkins|woodpecker|ci[ /-]?cd|\bregistry\b|development|dev tool/.test(signal)) return "development";
	if (/ansible|gitops|home assistant|node[ -]?red|\bmqtt\b|esphome|n8n|automation/.test(signal)) return "automation";
	if (/security|authentik|authelia|crowdsec|firewall/.test(signal)) return "security";
	if (/docker|portainer|kubernetes|\bk3s\b|nomad|container runtime|hypervisor|virtualization|proxmox|\blxc\b|container management|container|infrastructure/.test(signal)) return "infrastructure";
	return "other";
}

export function getHomelabItem(note: LibraryItem): HomelabItem {
	const classification = getHomelabClassification(note);
	const role = first(note, "role", "usecase", "description");
	return {
		...classification,
		title: note.title.replace(/^(?:zzzold_)?spec(?:ification)?s?(?:-sheet)?\s*[-–]\s*/i, ""),
		subtitle: compact(role, 52) ?? ({ server: "Compute node", nas: "Storage node", router: "Network node", switch: "Network node", vm: "Virtual machine", workstation: "Workstation", "mini-pc": "Mini PC", "raspberry-pi": "Raspberry Pi" } as Partial<Record<HomelabEntity, string>>)[classification.entity] ?? null,
		placement: compact(first(note, "location", "placement", "rack"), 34),
		hostname: compact(first(note, "hostname")),
		platform: compact(first(note, "platform", "motherboard")),
		os: formatHomelabOs(first(note, "os", "operating_system")),
		cpu: formatHomelabCpu(first(note, "cpu")),
		ram: formatHomelabMemory(first(note, "ram")),
		storage: formatHomelabStorage(rawValues(note, "storage_size", "storage")),
		network: formatHomelabNetwork(rawValues(note, "network", "network_interfaces").join(", ") || null),
		technologies: inferTechnologies(note),
	};
}

// Compatibility name for existing Homelab presentation consumers. The returned model is entity-based.
export const getHomelabNode = getHomelabItem;

function fact(label: string, value: string | null, icon: string, assetIcon?: string): HomelabCardFact | null {
	return value ? { label, value: compact(value, assetIcon ? 42 : 24)!, icon, assetIcon } : null;
}

function titleCase(value: string) {
	return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getHomelabCardPresentation(note: LibraryItem): HomelabCardPresentation {
	const item = getHomelabItem(note);
	const kind = item.cardKind;
	const description = compact(first(note, "description", "purpose", "usecase") ?? note.excerpt, 110);
	const base = {
		kind,
		status: item.operationalStatus,
		description,
		tags: note.tags.slice(0, 3),
	};

	if (kind === "node") {
		const rawOs = first(note, "os", "operating_system");
		const resolvedOs = rawOs ? formatOperatingSystem(rawOs, first(note, "os_version", "operating_system_version")) : null;
		const commonFacts = [fact("CPU", item.cpu, "cpu"), fact("RAM", item.ram, "cpu"), fact("Storage", item.storage, "hard-drive")];
		const facts = (["router", "switch"].includes(item.entity)
			? [...commonFacts, fact("Network", item.network, "server")]
			: [fact("OS", resolvedOs?.displayLabel ?? item.os, "server", resolvedOs?.icon), ...commonFacts, fact("Network", item.network, "server")]
		).filter((item): item is HomelabCardFact => Boolean(item)).slice(0, 4);
		return { ...base, title: item.title, subtitle: item.subtitle ?? item.hostname ?? "Documented node", icon: item.entity === "nas" ? "hard-drive" : "server", facts, footerPrimary: item.placement ?? item.hostname ?? "Homelab" };
	}

	if (kind === "service") {
		const category = getHomelabServiceCategory(note);
		const platform = first(note, "container_platform", "platform") ?? item.technologies.find((value) => ["Docker", "TrueNAS", "Kubernetes", "k3s", "Linux"].includes(value)) ?? null;
		const host = compact(first(note, "host", "hosted_on", "hostname"), 24);
		const fourthFact = (fact("Storage", first(note, "storage", "storage_path"), "hard-drive")
			?? fact("Runtime", first(note, "runtime"), "cpu")
			?? fact("Network", formatHomelabNetwork(first(note, "network")), "server")
			?? fact("Port", first(note, "port", "ports") ?? "TBD", "server"))!;
		const candidates = [
			fact("Platform", platform ?? "TBD", "server")!,
			fact("Host", host ?? "TBD", "server")!,
			fact("Version", first(note, "version", "app_version") ?? "TBD", "metadata-type")!,
			fourthFact,
		];
		return { ...base, title: getHomelabServiceName(note), subtitle: first(note, "role", "description") ?? (category ? `${titleCase(category)} service` : "Application service"), icon: "server", facts: candidates, footerPrimary: host ?? platform ?? "Homelab service" };
	}

	if (kind === "specification") {
		const category = first(note, "category", "subcategory");
		const candidates = [
			fact("CPU", formatHomelabCpu(first(note, "cpu")), "cpu"), fact("RAM", formatHomelabMemory(first(note, "ram", "memory")), "cpu"),
			fact("Capacity", first(note, "capacity"), "hard-drive"), fact("Interface", first(note, "interface", "interfaces"), "server"),
			fact("Expansion", first(note, "expansion", "pcie"), "layers-3"), fact("Drive bays", first(note, "drive_bays", "bays"), "hard-drive"),
			fact("Model", first(note, "model"), "metadata-type"),
		].filter((item): item is HomelabCardFact => Boolean(item)).slice(0, 4);
		return { ...base, status: null, title: first(note, "name") ?? item.title, subtitle: category ? `${titleCase(category)} specification` : "Hardware specification", icon: "cpu", facts: candidates, footerPrimary: [first(note, "brand", "manufacturer"), first(note, "model")].filter(Boolean).join(" ") || "Specification" };
	}

	if (kind === "dashboard") {
		const candidates = [fact("Widgets", first(note, "widgets"), "layout-grid"), fact("Sources", first(note, "sources"), "layers-3"), fact("Refresh", first(note, "refresh", "refresh_interval"), "clock-3")]
			.filter((item): item is HomelabCardFact => Boolean(item)).slice(0, 3);
		return { ...base, status: null, title: note.title, subtitle: first(note, "purpose", "description") ?? "Overview dashboard", icon: "layout-grid", facts: candidates, footerPrimary: candidates.length > 0 ? `${candidates.length} documented fields` : "Overview" };
	}

	return { ...base, status: null, title: note.title, subtitle: first(note, "category") ? titleCase(first(note, "category")!) : "Knowledge article", icon: "book-open", facts: [], footerPrimary: note.tags[0] ?? "Documentation" };
}

export function getHomelabMetadataValues(note: LibraryItem, key: string) {
	const classification = getHomelabClassification(note);
	if (key === "homelab_entity" || key === "homelab_kind") return [classification.entity];
	if (key === "homelab_lifecycle") return classification.lifecycle ? [classification.lifecycle] : [];
	if (key === "homelab_status") return classification.operationalStatus ? [classification.operationalStatus] : [];
	if (key === "homelab_service_category") {
		const category = getHomelabServiceCategory(note);
		return category ? [category] : [];
	}
	return getNoteMetadataValues(note, key);
}

function inferNodeCategory(note: LibraryItem): HomelabNodeCategory {
	const entity = getHomelabClassification(note).entity;
	if (["nas", "raspberry-pi", "router", "switch", "vm", "workstation"].includes(entity)) return entity as HomelabNodeCategory;
	return "server";
}

const platformPatterns: Array<[string, RegExp]> = [
	["Docker", /\bdocker\b/], ["Linux", /\blinux\b|ubuntu|debian|cachyos/], ["TrueNAS", /truenas/],
	["Proxmox", /proxmox/], ["Windows", /windows/], ["Kubernetes", /kubernetes|\bk3s\b/], ["OPNsense", /opnsense/],
];

function documentationArea(note: LibraryItem) {
	const signal = normalized(`${note.relativePath} ${note.title} ${first(note, "category") ?? ""}`);
	if (/service|docker|container|application/.test(signal)) return "Services";
	if (/network|vlan|dns|dhcp|router|switch|firewall|opnsense/.test(signal)) return "Networking";
	if (/storage|zfs|pool|dataset|backup|nas/.test(signal)) return "Storage";
	if (/hardware|spec|parts.database|cpu|ram|disk|ups/.test(signal)) return "Hardware";
	if (/automation|ansible|gitops/.test(signal)) return "Automation";
	return "Infrastructure";
}

function parseCapacityGb(value: string | null) {
	if (!value) return 0;
	const match = value.match(/(\d+(?:[.,]\d+)?)\s*(TB|GB)\b/i);
	if (!match) return 0;
	return Number(match[1].replace(",", ".")) * (match[2].toUpperCase() === "TB" ? 1000 : 1);
}

function relationKey(value: string) {
	return normalized(value.replace(/\.md$/i, "").replace(/^.*\//, "").replace(/^\d+(?:\.\d+)*\s+/, "").trim());
}

function linkTargets(note: LibraryItem) {
	const frontmatter = Object.values(note.frontmatter).flatMap((value) => Array.isArray(value) ? value : [value ?? ""]);
	const source = `${note.content}\n${frontmatter.join("\n")}`;
	return [...source.matchAll(/\[\[([^\]]+)\]\]/g)]
		.map((match) => relationKey(match[1].split("|")[0].split("#")[0]))
		.filter(Boolean);
}

function matchesIdentity(note: LibraryItem, value: string | null) {
	if (!value) return false;
	const key = relationKey(value);
	return [note.title, note.relativePath, first(note, "hostname"), first(note, "name")]
		.filter((item): item is string => Boolean(item))
		.some((item) => relationKey(item) === key);
}

export function buildHomelabRelations(note: LibraryItem, notes: LibraryItem[]): HomelabRelationGroup[] {
	const cardKind = getHomelabCardKind(note);
	const selectedKeys = new Set([relationKey(note.title), relationKey(note.relativePath)]);
	const outgoing = new Set(linkTargets(note));
	const linked = notes.filter((candidate) => candidate.id !== note.id && (
		outgoing.has(relationKey(candidate.title)) || outgoing.has(relationKey(candidate.relativePath))
		|| linkTargets(candidate).some((target) => selectedKeys.has(target))
	));
	const host = first(note, "host", "hosted_on", "hostname");
	const installedIn = first(note, "installed_in", "installed-in");
	const groups: Array<[string, LibraryItem[]]> = [];

	if (cardKind === "node") {
		groups.push(["Hosted Services", notes.filter((candidate) => getHomelabCardKind(candidate) === "service" && matchesIdentity(note, first(candidate, "host", "hosted_on", "hostname")))]);
		groups.push(["Related Specifications", notes.filter((candidate) => getHomelabCardKind(candidate) === "specification" && matchesIdentity(note, first(candidate, "installed_in", "installed-in")))]);
		groups.push(["Related Documentation", linked.filter((candidate) => getHomelabCardKind(candidate) === "documentation")]);
	} else if (cardKind === "service") {
		groups.push(["Hosted On", notes.filter((candidate) => getHomelabCardKind(candidate) === "node" && matchesIdentity(candidate, host))]);
		groups.push(["Related Services", linked.filter((candidate) => getHomelabCardKind(candidate) === "service")]);
		groups.push(["Related Documentation", linked.filter((candidate) => getHomelabCardKind(candidate) === "documentation")]);
	} else if (cardKind === "specification") {
		groups.push(["Installed In", notes.filter((candidate) => getHomelabCardKind(candidate) === "node" && matchesIdentity(candidate, installedIn))]);
		groups.push(["Compatible With", linked]);
	} else {
		groups.push(["Related Notes", linked]);
	}

	return groups.map(([label, candidates]) => ({
		label,
		items: [...new Map(candidates.map((candidate) => [candidate.id, candidate])).values()].slice(0, 6)
			.map((candidate) => ({ title: candidate.title, href: candidate.href, kind: getHomelabCardKind(candidate) })),
	})).filter((group) => group.items.length > 0);
}

export function buildHomelabDashboardModel(notes: LibraryItem[]) {
	const items = notes.map(getHomelabItem);
	const nodeNotes = items.filter((item) => item.cardKind === "node");
	const services = new Map<string, LibraryItem[]>();
	for (const note of notes.filter((item) => getHomelabClassification(item).entity === "service")) {
		const name = getHomelabServiceName(note);
		services.set(name, [...(services.get(name) ?? []), note]);
	}
	const serviceCategoryCounts = new Map<HomelabServiceCategory, number>();
	for (const serviceNotes of services.values()) {
		const category = serviceNotes.map(getHomelabServiceCategory).find(Boolean) ?? "other";
		serviceCategoryCounts.set(category, (serviceCategoryCounts.get(category) ?? 0) + 1);
	}
	const activeServices = [...services.values()].filter((serviceNotes) =>
		serviceNotes.some((note) => getHomelabClassification(note).operationalStatus === "active")
	).length;
	const technologies = new Map<string, number>();
	for (const item of items) for (const technology of item.technologies) technologies.set(technology, (technologies.get(technology) ?? 0) + 1);
	const cardKindCounts = new Map<HomelabCardKind, number>();
	for (const item of items) cardKindCounts.set(item.cardKind, (cardKindCounts.get(item.cardKind) ?? 0) + 1);
	const entityCounts = new Map<HomelabEntity, number>();
	for (const item of items) entityCounts.set(item.entity, (entityCounts.get(item.entity) ?? 0) + 1);
	const lifecycleCounts = new Map<HomelabLifecycle, number>();
	for (const item of items) if (item.lifecycle) lifecycleCounts.set(item.lifecycle, (lifecycleCounts.get(item.lifecycle) ?? 0) + 1);
	const nodeCategories = new Map<HomelabNodeCategory, number>();
	for (const note of notes.filter((item) => getHomelabCardKind(item) === "node")) {
		const category = inferNodeCategory(note);
		nodeCategories.set(category, (nodeCategories.get(category) ?? 0) + 1);
	}
	const platformCounts = new Map<string, number>();
	for (const note of notes) {
		const signal = normalized(`${first(note, "platform", "os", "container_platform", "runtime") ?? ""} ${getHomelabItem(note).technologies.join(" ")} ${note.title}`);
		for (const [label, pattern] of platformPatterns) if (pattern.test(signal)) platformCounts.set(label, (platformCounts.get(label) ?? 0) + 1);
	}
	const coverage = new Map<string, number>();
	for (const note of notes.filter((item) => getHomelabCardKind(item) === "documentation")) {
		const area = documentationArea(note);
		coverage.set(area, (coverage.get(area) ?? 0) + 1);
	}
	const pools = new Set(notes.flatMap((note) => rawValues(note, "pool")).map(normalized).filter(Boolean));
	const arrays = new Set(notes.flatMap((note) => rawValues(note, "array", "vdev")).map(normalized).filter((value) => value && value !== "single"));
	const totalStorageGb = notes.reduce((total, note) => {
		const quantity = Number(first(note, "quantity", "count") ?? "1");
		return total + parseCapacityGb(first(note, "capacity", "storage_size")) * (Number.isFinite(quantity) ? quantity : 1);
	}, 0);
	const nasCount = nodeCategories.get("nas") ?? 0;
	return {
		totalNodes: nodeNotes.length,
		totalServices: services.size,
		totalSpecifications: cardKindCounts.get("specification") ?? 0,
		totalDocumentation: cardKindCounts.get("documentation") ?? 0,
		activeServices,
		entities: [...entityCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "en")).map(([entity, count]) => ({ entity, count })),
		lifecycles: [...lifecycleCounts].sort((a, b) => b[1] - a[1]).map(([lifecycle, count]) => ({ lifecycle, count })),
		serviceSplit: [...serviceCategoryCounts.entries()]
			.sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "en"))
			.map(([value, count]) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1), count })),
		technologies: [...technologies].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, count]) => ({ label, count })),
		nodeDistribution: [...nodeCategories].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, label: value === "nas" ? "NAS" : value === "vm" ? "VM" : titleCase(value), count })),
		platformDistribution: [...platformCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([label, count]) => ({ label, count })),
		documentationCoverage: [...coverage].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([label, count]) => ({ label, count })),
		storageOverview: pools.size || arrays.size || totalStorageGb || nasCount ? {
			pools: pools.size, arrays: arrays.size, nas: nasCount,
			totalStorage: totalStorageGb >= 1000 ? `${Number((totalStorageGb / 1000).toFixed(1))} TB` : totalStorageGb > 0 ? `${totalStorageGb} GB` : "TBD",
		} : null,
	};
}
