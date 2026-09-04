import assert from "node:assert/strict";
import test from "node:test";
import { motionBurstParticles, renderMotionBurstMarkup } from "src/lib/motionBurst";

test("motion burst variants remain compact and geometrically distinct", () => {
	assert.deepEqual(new Set(motionBurstParticles.default.map((particle) => particle.shape)), new Set(["dot", "ring", "ray"]));
	assert.deepEqual(new Set(motionBurstParticles.sparkle.map((particle) => particle.shape)), new Set(["glint", "dot", "ray"]));
	assert.deepEqual(new Set(motionBurstParticles.sunray.map((particle) => particle.shape)), new Set(["ray"]));
	for (const particles of Object.values(motionBurstParticles)) {
		assert.ok(particles.length >= 6 && particles.length <= 10);
		assert.ok(new Set(particles.map((particle) => particle.size)).size >= 4);
		for (const particle of particles) {
			assert.ok(Math.hypot(particle.x, particle.y) * .78 >= 12);
			assert.ok(Math.hypot(particle.x, particle.y) * .78 <= 17);
			assert.ok(particle.delay <= 18);
			if (particles !== motionBurstParticles.sunray) {
				assert.ok(Math.abs(particle.curve) >= 3 && Math.abs(particle.curve) <= 4);
			}
		}
	}
});

test("generated motion markup uses the shared semantic API", () => {
	const markup = renderMotionBurstMarkup("sparkle", "favorite");
	assert.match(markup, /data-motion-variant="sparkle"/);
	assert.match(markup, /data-motion-color="favorite"/);
	assert.match(markup, /data-motion-shape="glint"/);
	assert.match(markup, /aria-hidden="true"/);
});
