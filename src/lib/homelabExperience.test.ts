import assert from "node:assert/strict";
import test from "node:test";
import { buildHomelabDashboardModel, buildHomelabRelations, formatHomelabCpu, formatHomelabMemory, formatHomelabNetwork, formatHomelabStorage, getHomelabArtworkCategory, getHomelabCardPresentation, getHomelabClassification, getHomelabFormFactor, getHomelabInspectorMetadataEntries, getHomelabNode, getHomelabNodeCategory, getHomelabMetadataValues, getHomelabServiceCategory } from "src/lib/experiences/homelab";
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

test("Homelab derives node artwork category without overriding frontmatter entity", () => {
	const titan = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.02 Planned/spec-sheet - Titan (Media Server).md", {
		type: "server", role: "NAS / media-tank (ZFS storage)", os: "TrueNAS SCALE",
	});
	const charon = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/spec-sheet - Charon.md", {
		type: "server", platform: "rpi_cm4_8gb", os: "Raspberry Pi OS Lite",
	});
	assert.equal(getHomelabClassification(titan).entity, "server");
	assert.equal(getHomelabNodeCategory(titan), "nas");
	assert.equal(getHomelabClassification(charon).entity, "server");
	assert.equal(getHomelabNodeCategory(charon), "raspberry-pi");
});

test("Homelab keeps device type independent from physical form factor", () => {
	const desktop = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/Desktop.md", { type: "workstation", form_factor: "desktop" });
	const laptop = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/Laptop.md", { type: "workstation", form_factor: "notebook" });
	const allInOne = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/Studio computer.md", { type: "workstation", form_factor: "all_in_one" });
	for (const item of [desktop, laptop, allInOne]) {
		assert.equal(getHomelabClassification(item).entity, "workstation");
		assert.equal(getHomelabClassification(item).cardKind, "node");
	}
	assert.equal(getHomelabFormFactor(laptop), "laptop");
	assert.deepEqual(getHomelabMetadataValues(laptop, "homelab_form_factor"), ["laptop"]);
	assert.deepEqual(getHomelabMetadataValues(note("07 Mitt Homelab/07.04 Knowledgebase/Laptop guide.md", { form_factor: "laptop" }), "homelab_form_factor"), []);
	assert.equal(getHomelabArtworkCategory(desktop), "workstation-desktop");
	assert.equal(getHomelabArtworkCategory(laptop), "workstation-laptop");
	assert.equal(getHomelabArtworkCategory(allInOne), "workstation-all-in-one");
});

test("Homelab artwork prefers form factor before role overrides and preserves legacy fallbacks", () => {
	const towerNas = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/Tower NAS.md", { type: "server", form_factor: "tower", role: "NAS with ZFS" });
	const rackServer = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/Rack server.md", { type: "server", form_factor: "rackmount" });
	const piWorkstation = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/Pi workstation.md", { type: "workstation", form_factor: "mini-pc" });
	const legacyNas = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/Legacy NAS.md", { type: "server", role: "NAS with ZFS" });
	assert.equal(getHomelabArtworkCategory(towerNas), "server-tower");
	assert.equal(getHomelabArtworkCategory(rackServer), "server-rack");
	assert.equal(getHomelabArtworkCategory(piWorkstation), "workstation-mini-pc");
	assert.equal(getHomelabArtworkCategory(legacyNas), "nas");
});

test("Homelab artwork resolves from both entity and form factor", () => {
	const server = (formFactor: string) => note(`07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/Server ${formFactor}.md`, { type: "server", form_factor: formFactor });
	const workstation = (formFactor: string) => note(`07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/Workstation ${formFactor}.md`, { type: "workstation", form_factor: formFactor });
	assert.equal(getHomelabArtworkCategory(server("rack")), "server-rack");
	assert.equal(getHomelabArtworkCategory(server("tower")), "server-tower");
	assert.equal(getHomelabArtworkCategory(server("desktop")), "server-desktop");
	assert.equal(getHomelabArtworkCategory(server("mini-pc")), "server-mini-pc");
	assert.equal(getHomelabArtworkCategory(workstation("tower")), "workstation-desktop");
	assert.equal(getHomelabArtworkCategory(workstation("laptop")), "workstation-laptop");
	assert.equal(getHomelabArtworkCategory(workstation("all-in-one")), "workstation-all-in-one");
	assert.equal(getHomelabArtworkCategory(workstation("mini-pc")), "workstation-mini-pc");
	assert.equal(getHomelabArtworkCategory(note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/Phone.md", { type: "smartphone", form_factor: "handheld" })), "smartphone");
	assert.equal(getHomelabArtworkCategory(note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/Tablet.md", { type: "tablet", form_factor: "tablet" })), "tablet");
});

test("Homelab resolves embedded edge devices without changing their entity", () => {
	const satellite = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/AI satellite.md", {
		type: "server",
		form_factor: "edge-device",
		role: "Distributed AI satellite",
	});
	assert.equal(getHomelabClassification(satellite).entity, "server");
	assert.equal(getHomelabFormFactor(satellite), "embedded");
	assert.equal(getHomelabArtworkCategory(satellite), "embedded");
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

test("Homelab selects every iteration 2 card kind within documentation boundaries", () => {
	assert.equal(getHomelabNode(note("07 Mitt Homelab/07.02 Services/Jellyfin.md")).cardKind, "service");
	assert.equal(getHomelabNode(note("07 Mitt Homelab/07.02 Services/Grafana/Index.md")).cardKind, "service");
	assert.equal(getHomelabNode(note("07 Mitt Homelab/07.02 Services/Grafana/Configuration.md")).cardKind, "documentation");
	assert.equal(getHomelabNode(note("07 Mitt Homelab/07.02 Services/Docker diagram.md")).cardKind, "dashboard");
	assert.equal(getHomelabNode(note("07 Mitt Homelab/07.02 Services/Exporters/README_exporter.md")).cardKind, "documentation");
	assert.equal(getHomelabNode(note("07 Mitt Homelab/07.99 Inspo/Mother of dashboards.md")).cardKind, "documentation");
	assert.equal(getHomelabNode(note("07 Mitt Homelab/07.05 Hardware_specs/07.05.98 Parts_Database/hdd.md", { type: "part" })).cardKind, "specification");
	assert.equal(getHomelabNode(note("07 Mitt Homelab/07.00 Dashboard/Homelab Architecture (PAD).md")).cardKind, "documentation");
	assert.equal(getHomelabNode(note("07 Mitt Homelab/07.04 Knowledgebase/VLAN Guide.md")).cardKind, "documentation");
	assert.equal(getHomelabNode(note("07 Mitt Homelab/07.04 Knowledgebase/VLAN Guide.md", { type: "dashboard" })).cardKind, "documentation");
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

test("Homelab scopes UPS specifications to Hardware_specs inventory", () => {
	const currentUps = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/spec-sheet - Backup System (UPS).md", { type: "ups" });
	const archivedApc = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.99 Archived_Specs/zzzOLD_specs - backup system (APC).md");
	const explicitGuide = note("07 Mitt Homelab/07.03 Operations/UPS replacement guide.md", { type: "ups" });
	const incidentalGuide = note("07 Mitt Homelab/07.03 Operations/APC backup system notes.md");
	assert.deepEqual(getHomelabClassification(currentUps), { entity: "ups", lifecycle: "current", operationalStatus: "active", cardKind: "specification" });
	assert.deepEqual(getHomelabClassification(archivedApc), { entity: "ups", lifecycle: "archived", operationalStatus: "archived", cardKind: "specification" });
	for (const item of [explicitGuide, incidentalGuide]) {
		assert.equal(getHomelabClassification(item).entity, "documentation");
		assert.equal(getHomelabClassification(item).cardKind, "documentation");
	}
});

test("Homelab does not classify notes as displays from incidental content mentions", () => {
	const index = note("07 Mitt Homelab/07.00 Dashboard/07.00.00 Index.md");
	index.content = "A dashboard displaying all nodes and monitoring services.";
	const exporter = note("07 Mitt Homelab/07.02 Services/Monitoring/Exporters/jellyfin_exporter.py.md");
	exporter.content = "Monitor exporter health and display collected metrics.";
	const inspiration = note("07 Mitt Homelab/07.99 Inspo/Cabinet server and tablet.md");
	inspiration.content = "A wall-mounted display beside the rack.";
	assert.equal(getHomelabClassification(index).entity, "documentation");
	assert.equal(getHomelabClassification(exporter).entity, "documentation");
	assert.equal(getHomelabClassification(inspiration).entity, "documentation");
});

test("Homelab Knowledgebase is always documentation", () => {
	const truenasGuide = note("07 Mitt Homelab/07.04 Knowledgebase/TrueNAS/SMB Guide.md");
	truenasGuide.content = "TrueNAS NAS server storage configuration.";
	const piGuide = note("07 Mitt Homelab/07.04 Knowledgebase/Raspberry Pi Fan Setup.md", { type: "raspberry-pi" });
	assert.deepEqual(getHomelabClassification(truenasGuide), {
		entity: "documentation", lifecycle: null, operationalStatus: null, cardKind: "documentation",
	});
	assert.deepEqual(getHomelabClassification(piGuide), {
		entity: "documentation", lifecycle: null, operationalStatus: null, cardKind: "documentation",
	});
});

test("Homelab Infrastructure is always documentation", () => {
	const firewall = note("07 Mitt Homelab/07.01 Infrastructure/Firewall.md");
	firewall.content = "OPNsense router and TrueNAS firewall design.";
	const topology = note("07 Mitt Homelab/07.01 Infrastructure/network-topology.md", { type: "dashboard" });
	assert.equal(getHomelabClassification(firewall).entity, "documentation");
	assert.equal(getHomelabClassification(topology).entity, "documentation");
	assert.equal(getHomelabClassification(topology).cardKind, "documentation");
});

test("Homelab Dashboard and Resources folders are always documentation", () => {
	const architecture = note("07 Mitt Homelab/07.00 Dashboard/Homelab Architecture.md", { type: "dashboard" });
	const serverNames = note("07 Mitt Homelab/07.97 Resources/server names.md");
	serverNames.content = "Naming examples for NAS and server nodes.";
	for (const item of [architecture, serverNames]) {
		assert.equal(getHomelabClassification(item).entity, "documentation");
		assert.equal(getHomelabClassification(item).cardKind, "documentation");
	}
});

test("Homelab nodes can only originate from Hardware_specs", () => {
	const hardwareNode = note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/Atlas.md", { type: "nas" });
	const misplacedExplicitNode = note("07 Mitt Homelab/07.99 Inspo/Example server.md", { type: "server" });
	const machineLikeNote = note("07 Mitt Homelab/07.03 Operations/TrueNAS recovery.md");
	machineLikeNote.content = "TrueNAS NAS hostname atlas with CPU and RAM details.";
	assert.equal(getHomelabClassification(hardwareNode).cardKind, "node");
	for (const item of [misplacedExplicitNode, machineLikeNote]) {
		assert.equal(getHomelabClassification(item).entity, "documentation");
		assert.equal(getHomelabClassification(item).cardKind, "documentation");
	}
});

test("Homelab classification precedence matrix preserves folder invariants", () => {
	const cases: Array<[string, LibraryItem, string, string]> = [
		["documentation boundary beats explicit server", note("07 Mitt Homelab/07.01 Infrastructure/Server design.md", { type: "server" }), "documentation", "documentation"],
		["service root beats machine semantics", note("07 Mitt Homelab/07.02 Services/TrueNAS Agent.md", { type: "service", category: "network" }), "service", "service"],
		["service subtree cannot become a node", note("07 Mitt Homelab/07.02 Services/Grafana/Server setup.md", { type: "server" }), "documentation", "documentation"],
		["hardware inventory permits explicit nodes", note("07 Mitt Homelab/07.05 Hardware_specs/07.05.02 Planned/Titan.md", { type: "server" }), "server", "node"],
		["parts inventory beats server vocabulary", note("07 Mitt Homelab/07.05 Hardware_specs/07.05.98 Parts_Database/NIC.md"), "part", "specification"],
	];
	cases[4][1].content = "Server network adapter for a TrueNAS node.";
	for (const [message, item, entity, cardKind] of cases) {
		const classification = getHomelabClassification(item);
		assert.equal(classification.entity, entity, message);
		assert.equal(classification.cardKind, cardKind, message);
	}
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
	assert.equal(getHomelabServiceCategory(note("07 Mitt Homelab/07.02 Services/Pi-hole/Pi-hole + Unbound.md", { type: "service", category: "network" })), "networking");
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
	const standby = note("07 Mitt Homelab/07.02 Services/Forgejo.md", { status: "standby" });
	const offline = note("07 Mitt Homelab/07.02 Services/Jellyfin.md", { status: "offline" });
	const archived = note("07 Mitt Homelab/07.02 Services/Old App.md", { status: "archived" });
	const invalid = note("07 Mitt Homelab/07.02 Services/Owned App.md", { status: "owned" });
	assert.equal(getHomelabNode(active).operationalStatus, "active");
	assert.equal(getHomelabNode(standby).operationalStatus, "standby");
	assert.deepEqual(getHomelabMetadataValues(standby, "homelab_status"), ["standby"]);
	assert.equal(getHomelabInspectorMetadataEntries(standby, ["status"])[0]?.value, "Standby");
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
		note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/spec-sheet - Pi.md", { type: "raspberry-pi", os: "Linux", form_factor: "mini-pc" }),
		note("07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/Field workstation.md", { type: "workstation", form_factor: "laptop" }),
		note("07 Mitt Homelab/07.02 Services/Jellyfin.md", { platform: "Docker", status: "active" }),
		note("07 Mitt Homelab/07.05 Hardware_specs/07.05.98 Parts_Database/disk.md", { type: "part", category: "storage", capacity: "12 TB", quantity: "2", pool: "tank", vdev: "raidz1" }),
		note("07 Mitt Homelab/07.04 Knowledgebase/VLAN Guide.md"),
	]);
	assert.equal(model.totalNodes, 3);
	assert.equal(model.totalServices, 1);
	assert.equal(model.totalSpecifications, 1);
	assert.equal(model.totalDocumentation, 1);
	assert.deepEqual(model.lifecycles, [{ lifecycle: "current", count: 3 }]);
	assert.ok(model.entities.some((item) => item.entity === "part" && item.count === 1));
	assert.deepEqual(model.formFactors, [{ formFactor: "laptop", label: "Laptop", count: 1 }, { formFactor: "mini-pc", label: "Mini Pc", count: 1 }]);
	assert.deepEqual(model.nodeDistribution, [{ value: "nas", label: "NAS", count: 1 }, { value: "raspberry-pi", label: "Raspberry Pi", count: 1 }, { value: "workstation", label: "Workstation", count: 1 }]);
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
