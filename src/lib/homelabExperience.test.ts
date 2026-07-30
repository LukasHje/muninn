import assert from "node:assert/strict";
import test from "node:test";
import { buildHomelabDashboardModel, buildHomelabRelations, formatHomelabCpu, formatHomelabMemory, formatHomelabNetwork, formatHomelabStorage, getHomelabCardPresentation, getHomelabClassification, getHomelabInspectorMetadataEntries, getHomelabNode, getHomelabMetadataValues, getHomelabServiceCategory } from "src/lib/experiences/homelab";
import type { LibraryItem } from "src/lib/vault";

function note(relativePath: string, frontmatter: LibraryItem["frontmatter"] = {}): LibraryItem {
	return { id: relativePath, title: relativePath.split("/").at(-1)!.replace(/\.md$/, ""), href: "", slugPath: "", domainKey: "teknik", domainLabel: "Technology", domainIcon: "cpu", tone: "sky", excerpt: "", updatedLabel: "today", relativePath, createdAt: 0, updatedAt: 0, content: "", frontmatter, normalized: { title: "", type: String(frontmatter.type ?? "note"), domain: "teknik", metadata: frontmatter } as LibraryItem["normalized"], imageReferences: {}, tags: [] };
}

test("Homelab prioritizes node frontmatter and extracts the Node Card model", () => {
	const item = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/spec-sheet - Charon.md", { type: "server", status: "active", role: "DNS resolver", hostname: "charon", os: "Raspberry Pi OS", cpu: "Quad-core ARM", ram: "8 GB", storage_size: "8 GB", location: "Server tower" });
	const node = getHomelabNode(item);
	assert.equal(node.cardKind, "node");
	assert.equal(node.entity, "server");
	assert.equal(node.lifecycle, "current");
	assert.equal(node.operationalStatus, "active");
	assert.equal(node.hostname, "charon");
	assert.equal(node.storage, "8 GB");
});

test("Homelab node cards render a resolved local OS asset and preserve inline releases", () => {
	const truenas = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/Atlas.md", {
		type: "nas",
		os: "TrueNAS SCALE Dragonfish 24.04",
	});
	const ubuntu = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/Build host.md", {
		type: "server",
		os: "ubuntu-server",
		os_version: "24.04 LTS",
	});
	const truenasOs = getHomelabCardPresentation(truenas).facts.find((fact) => fact.label === "OS")!;
	const ubuntuOs = getHomelabCardPresentation(ubuntu).facts.find((fact) => fact.label === "OS")!;
	assert.equal(truenasOs.value, "TrueNAS SCALE Dragonfish 24.04");
	assert.equal(truenasOs.assetIcon, "/assets/os/truenas.svg");
	assert.equal(ubuntuOs.value, "Ubuntu 24.04 LTS");
	assert.equal(ubuntuOs.assetIcon, "/assets/os/ubuntu.svg");
});

test("Homelab derives lifecycle, but not entity, from its numbered folder structure", () => {
	const service = note("07 Mitt Homelab/07.02 Services/Grafana/Dashboards/Overview.md");
	const planned = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.02 Planned/spec-sheet - Titan.md", { cpu: "Ryzen", ram: "64 GB" });
	assert.deepEqual(getHomelabMetadataValues(service, "homelab_entity"), ["documentation"]);
	assert.equal(getHomelabNode(service).cardKind, "documentation");
	assert.equal(getHomelabNode(planned).cardKind, "node");
	assert.equal(getHomelabNode(planned).lifecycle, "planned");
	assert.equal(getHomelabNode(planned).operationalStatus, "planned");
});

test("Homelab selects every iteration 2 card kind with frontmatter priority", () => {
	assert.equal(getHomelabNode(note("07 Mitt Homelab/07.02 Services/Jellyfin.md")).cardKind, "service");
	assert.equal(getHomelabNode(note("07 Mitt Homelab/07.02 Services/Grafana/Index.md")).cardKind, "service");
	assert.equal(getHomelabNode(note("07 Mitt Homelab/07.02 Services/Grafana/Configuration.md")).cardKind, "documentation");
	assert.equal(getHomelabNode(note("07 Mitt Homelab/07.02 Services/Docker diagram.md")).cardKind, "dashboard");
	assert.equal(getHomelabNode(note("07 Mitt Homelab/07.02 Services/Exporters/README_exporter.md")).cardKind, "documentation");
	assert.equal(getHomelabNode(note("07 Mitt Homelab/07.99 Inspo/Mother of dashboards.md")).cardKind, "documentation");
	assert.equal(getHomelabNode(note("07 Mitt Homelab/07.05 Hardware_specs/07.05.98 Parts_Database/hdd.md", { type: "part" })).cardKind, "specification");
	assert.equal(getHomelabNode(note("07 Mitt Homelab/07.00 Dashboard/Homelab Architecture (PAD).md")).cardKind, "dashboard");
	assert.equal(getHomelabNode(note("07 Mitt Homelab/07.04 Knowledgebase/VLAN Guide.md")).cardKind, "documentation");
	assert.equal(getHomelabNode(note("07 Mitt Homelab/07.04 Knowledgebase/VLAN Guide.md", { type: "dashboard" })).cardKind, "dashboard");
});

test("Homelab keeps entity, lifecycle, operational status and card kind independent", () => {
	const currentDisplay = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/Dell monitor.md", { type: "display" });
	const currentUps = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/APC UPS.md", { type: "ups", status: "offline" });
	const archivedServer = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.99 Archived_Specs/Old server.md", { type: "server" });
	const plannedServerWithOverride = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.02 Planned/New server.md", { type: "server", status: "maintenance" });
	assert.deepEqual(getHomelabClassification(currentDisplay), { entity: "display", lifecycle: "current", operationalStatus: "active", cardKind: "specification" });
	assert.deepEqual(getHomelabClassification(currentUps), { entity: "ups", lifecycle: "current", operationalStatus: "offline", cardKind: "specification" });
	assert.deepEqual(getHomelabClassification(archivedServer), { entity: "server", lifecycle: "archived", operationalStatus: "archived", cardKind: "node" });
	assert.deepEqual(getHomelabClassification(plannedServerWithOverride), { entity: "server", lifecycle: "planned", operationalStatus: "maintenance", cardKind: "node" });
});

test("Homelab inventory and lifecycle folders never promote components to nodes", () => {
	const currentKeyboard = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/Keyboard.md", { type: "part", category: "keyboard" });
	const inventoryHba = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.98 Parts_Database/LSI HBA.md");
	const archivedDisplay = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.99 Archived_Specs/Old monitor.md", { type: "display" });
	for (const item of [currentKeyboard, inventoryHba, archivedDisplay]) assert.equal(getHomelabClassification(item).cardKind, "specification");
	assert.equal(getHomelabClassification(currentKeyboard).entity, "part");
	assert.equal(getHomelabClassification(inventoryHba).entity, "part");
	assert.equal(getHomelabClassification(archivedDisplay).entity, "display");
});

test("Homelab entity priority uses explicit frontmatter rather than globally inferred note type", () => {
	const item = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/spec-sheet - Atlas.md", { hostname: "atlas", cpu: "Intel N100", ram: "16 GB" });
	item.normalized.type = "reference";
	assert.equal(getHomelabClassification(item).entity, "server");
});

test("Homelab normalizes governance notes to documentation before content heuristics", () => {
	const governance = note("07 Mitt Homelab/07.01 Infrastructure/Naming Authority.md", { type: "governance", category: "naming" });
	governance.content = "Naming rules for every node. Titan is the NAS / main server.";
	assert.deepEqual(getHomelabClassification(governance), { entity: "documentation", lifecycle: null, operationalStatus: null, cardKind: "documentation" });
});

test("Homelab explicit lifecycle overrides path and card-kind metadata cannot override entity rendering", () => {
	const item = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/Monitor.md", { type: "display", lifecycle: "planned", card_kind: "node" });
	assert.deepEqual(getHomelabClassification(item), { entity: "display", lifecycle: "planned", operationalStatus: "planned", cardKind: "specification" });
	assert.deepEqual(getHomelabMetadataValues(item, "homelab_lifecycle"), ["planned"]);
});

test("Homelab to-upgrade lifecycle provides maintenance only as a status fallback", () => {
	const fallback = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.03 To_Upgrade/Atlas.md", { type: "server" });
	const explicit = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.03 To_Upgrade/Charon.md", { type: "server", status: "active" });
	assert.equal(getHomelabClassification(fallback).operationalStatus, "maintenance");
	assert.equal(getHomelabClassification(explicit).operationalStatus, "active");
});

test("Homelab dashboard counts service roots rather than every service document", () => {
	const model = buildHomelabDashboardModel([
		note("07 Mitt Homelab/07.02 Services/Grafana/Index.md", { status: "active" }),
		note("07 Mitt Homelab/07.02 Services/Grafana/Dashboards/Overview.md"),
		note("07 Mitt Homelab/07.02 Services/Jellyfin.md"),
	]);
	assert.equal(model.totalServices, 2);
	assert.equal(model.activeServices, 1);
});

test("Homelab derives a split from unique service types", () => {
	const jellyfin = note("07 Mitt Homelab/07.02 Services/Jellyfin.md", { tags: ["media"] });
	const immich = note("07 Mitt Homelab/07.02 Services/Immich/Index.md");
	const pihole = note("07 Mitt Homelab/07.02 Services/Pi-hole.md", { tags: ["dns"] });
	const grafanaIndex = note("07 Mitt Homelab/07.02 Services/Grafana/Index.md", { tags: ["monitoring"] });
	const grafanaDashboard = note("07 Mitt Homelab/07.02 Services/Grafana/Dashboards/Home.md");
	const model = buildHomelabDashboardModel([jellyfin, immich, pihole, grafanaIndex, grafanaDashboard]);
	assert.equal(getHomelabServiceCategory(jellyfin), "media");
	assert.equal(getHomelabServiceCategory(pihole), "utilities");
	assert.equal(getHomelabServiceCategory(note("07 Mitt Homelab/07.02 Services/Nextcloud.md")), "applications");
	assert.equal(getHomelabServiceCategory(note("07 Mitt Homelab/07.02 Services/Paperless.md", { category: "Self-hosted Applications" })), "applications");
	assert.equal(getHomelabServiceCategory(note("07 Mitt Homelab/07.02 Services/Woodpecker CI.md")), "development");
	assert.equal(getHomelabServiceCategory(note("07 Mitt Homelab/07.02 Services/ESPHome.md")), "automation");
	assert.equal(getHomelabServiceCategory(note("07 Mitt Homelab/07.02 Services/Custom Tool.md", { category: "Generic Service" })), "other");
	assert.equal(getHomelabServiceCategory(note("07 Mitt Homelab/07.02 Services/Proxmox UI.md")), "infrastructure");
	assert.equal(getHomelabServiceCategory(note("07 Mitt Homelab/07.02 Services/Nomad.md")), "infrastructure");
	assert.deepEqual(model.serviceSplit, [
		{ value: "media", label: "Media", count: 2 },
		{ value: "monitoring", label: "Monitoring", count: 1 },
		{ value: "utilities", label: "Utilities", count: 1 },
	]);
});

test("Homelab service presentation keeps a four-position application spec bar", () => {
	const service = note("07 Mitt Homelab/07.02 Services/Immich.md", { host: "heimdall", platform: "Docker", version: "1.2.3" });
	const card = getHomelabCardPresentation(service);
	assert.equal(card.kind, "service");
	assert.equal(card.title, "Immich");
	assert.deepEqual(card.facts.map((item) => [item.label, item.value]), [
		["Platform", "Docker"], ["Host", "heimdall"], ["Version", "1.2.3"], ["Port", "TBD"],
	]);
});

test("Homelab service identity ignores organizational category folders", () => {
	const prometheus = note("07 Mitt Homelab/07.02 Services/Monitoring/Prometheus.md", { type: "service", category: "monitoring" });
	const grafanaIndex = note("07 Mitt Homelab/07.02 Services/Monitoring/Grafana/Index.md", { type: "service", category: "monitoring" });
	assert.equal(getHomelabCardPresentation(prometheus).title, "Prometheus");
	assert.equal(getHomelabCardPresentation(grafanaIndex).title, "Grafana");
	assert.equal(buildHomelabDashboardModel([prometheus, grafanaIndex]).totalServices, 2);
});

test("Homelab service lifecycle never canonicalizes active as owned", () => {
	const active = note("07 Mitt Homelab/07.02 Services/Immich.md", { status: "active" });
	const offline = note("07 Mitt Homelab/07.02 Services/Jellyfin.md", { status: "offline" });
	const archived = note("07 Mitt Homelab/07.02 Services/Old App.md", { status: "archived" });
	const invalid = note("07 Mitt Homelab/07.02 Services/Owned App.md", { status: "owned" });
	assert.equal(getHomelabNode(active).operationalStatus, "active");
	assert.equal(getHomelabNode(offline).operationalStatus, "offline");
	assert.equal(getHomelabNode(archived).operationalStatus, "archived");
	assert.equal(getHomelabNode(invalid).operationalStatus, null);
	assert.equal(getHomelabInspectorMetadataEntries(active, ["status"])[0]?.value, "Active");
});

test("Homelab compacts raw node specifications into comparable card facts", () => {
	assert.equal(formatHomelabCpu("MediaTek MT7986A Quad core Cortex A53 2.0 GHz"), "4 cores");
	assert.equal(formatHomelabCpu("AMD Ryzen 5 5600 (6C/12T)"), "6 cores");
	assert.equal(formatHomelabCpu("Intel Core i5-8600K @ 3.60GHz"), "6 cores");
	assert.equal(formatHomelabCpu("AMD Ryzen 5 5600 (ZFS, SMB/NFS, low power)"), "6 cores");
	assert.equal(formatHomelabCpu("AMD Ryzen 7 or Intel i7"), "8 cores");
	assert.equal(formatHomelabCpu("Intel Core i5-14500 (iGPU / Quick Sync)"), "14 cores");
	assert.equal(formatHomelabCpu("TBD - x86-64 preferred"), "TBD");
	assert.equal(formatHomelabMemory("1 GB DDR4"), "1GB");
	assert.equal(formatHomelabMemory("2×8 GB DDR4"), "16GB");
	assert.equal(formatHomelabStorage(["8 GB eMMC"]), "8 GB");
	assert.equal(formatHomelabStorage(["2×12 TB HDD", "1 TB NVMe"]), "25 TB");
	assert.equal(formatHomelabNetwork("2.5 GbE, Gigabit Ethernet and Wi-Fi 6"), "2.5 GbE");
	assert.equal(formatHomelabStorage(["SSD storage capacity TBD"]), "TBD");
	assert.equal(formatHomelabNetwork("Lokalt nätverk (Ethernet)"), "TBD");
	assert.equal(formatHomelabMemory("Memory capacity not specified"), "TBD");
});

test("Homelab iteration 3 aggregates card kinds, distributions and conditional storage", () => {
	const model = buildHomelabDashboardModel([
		note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/spec-sheet - Atlas.md", { type: "nas", hostname: "atlas", os: "TrueNAS SCALE" }),
		note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/spec-sheet - Pi.md", { type: "raspberry-pi", os: "Linux" }),
		note("07 Mitt Homelab/07.02 Services/Jellyfin.md", { platform: "Docker", status: "active" }),
		note("07 Mitt Homelab/07.05 Hardware_specs/07.05.98 Parts_Database/disk.md", { type: "part", category: "storage", capacity: "12 TB", quantity: "2", pool: "tank", vdev: "raidz1" }),
		note("07 Mitt Homelab/07.04 Knowledgebase/VLAN Guide.md"),
	]);
	assert.equal(model.totalNodes, 2);
	assert.equal(model.totalServices, 1);
	assert.equal(model.totalSpecifications, 1);
	assert.equal(model.totalDocumentation, 1);
	assert.deepEqual(model.lifecycles, [{ lifecycle: "current", count: 2 }]);
	assert.ok(model.entities.some((item) => item.entity === "part" && item.count === 1));
	assert.deepEqual(model.nodeDistribution, [{ value: "nas", label: "NAS", count: 1 }, { value: "raspberry-pi", label: "Raspberry Pi", count: 1 }]);
	assert.ok(model.platformDistribution.some((item) => item.label === "Docker" && item.count === 1));
	assert.deepEqual(model.documentationCoverage, [{ label: "Networking", count: 1 }]);
	assert.deepEqual(model.storageOverview, { pools: 1, arrays: 1, nas: 1, totalStorage: "24 TB" });
});

test("Homelab inspector derives read-only host, installation and wikilink relations", () => {
	const nodeItem = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/spec-sheet - Atlas.md", { type: "nas", hostname: "atlas" });
	const service = note("07 Mitt Homelab/07.02 Services/Jellyfin.md", { host: "atlas" });
	const specification = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.98 Parts_Database/HBA.md", { type: "part", installed_in: "atlas" });
	const documentation = note("07 Mitt Homelab/07.04 Knowledgebase/Storage Guide.md");
	documentation.content = "See [[spec-sheet - Atlas]].";
	const notes = [nodeItem, service, specification, documentation];
	assert.deepEqual(buildHomelabRelations(nodeItem, notes).map((group) => [group.label, group.items.map((item) => item.title)]), [
		["Hosted Services", ["Jellyfin"]], ["Related Specifications", ["HBA"]], ["Related Documentation", ["Storage Guide"]],
	]);
	assert.equal(buildHomelabRelations(service, notes)[0]?.label, "Hosted On");
	assert.equal(buildHomelabRelations(specification, notes)[0]?.label, "Installed In");
});
