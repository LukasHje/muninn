import assert from "node:assert/strict";
import test from "node:test";
import { formatOperatingSystem, operatingSystems, resolveOperatingSystem } from "src/lib/os-registry";

test("operating system aliases resolve to their canonical definitions", () => {
	assert.equal(resolveOperatingSystem("ubuntu-server").id, "ubuntu");
	assert.equal(resolveOperatingSystem("truenas-scale").id, "truenas");
	assert.equal(resolveOperatingSystem("scale").id, "truenas");
	assert.equal(resolveOperatingSystem("raspios").id, "raspberry-pi-os");
});

test("operating system formatting accepts separate and inline release information", () => {
	assert.equal(formatOperatingSystem("ubuntu", "24.04 LTS").displayLabel, "Ubuntu 24.04 LTS");
	assert.equal(formatOperatingSystem("TrueNAS SCALE Dragonfish 24.04").displayLabel, "TrueNAS SCALE Dragonfish 24.04");
	assert.equal(formatOperatingSystem("truenas", "25.04.1").displayLabel, "TrueNAS SCALE 25.04.1");
});

test("operating system fallbacks distinguish generic Linux from unknown systems", () => {
	assert.equal(resolveOperatingSystem("custom-linux-appliance").id, "linux");
	assert.equal(resolveOperatingSystem("entirely unfamiliar platform").id, "unknown");
	assert.equal(operatingSystems.length, 15);
	for (const definition of operatingSystems) assert.match(definition.icon, /^\/assets\/os\/.+\.svg$/);
});
