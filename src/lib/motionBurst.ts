export type MotionBurstVariant = "default" | "sparkle" | "sunray";
export type MotionBurstColor = "accent" | "favorite";

export interface MotionBurstParticle {
	shape: "dot" | "ring" | "ray" | "glint";
	x: number;
	y: number;
	rotation: number;
	delay: number;
	size: number;
	curve: number;
}

export const motionBurstParticles: Record<MotionBurstVariant, MotionBurstParticle[]> = {
	default: [
		{ shape: "dot", x: 1, y: -17, rotation: 8, delay: 0, size: 1.25, curve: 3 },
		{ shape: "ring", x: 13, y: -12, rotation: 24, delay: 16, size: .78, curve: -4 },
		{ shape: "ray", x: 19, y: -2, rotation: 72, delay: 11, size: 1.1, curve: 3 },
		{ shape: "dot", x: 14, y: 13, rotation: 12, delay: 18, size: .72, curve: 4 },
		{ shape: "ring", x: 2, y: 18, rotation: -8, delay: 16, size: 1.18, curve: -3 },
		{ shape: "dot", x: -12, y: 15, rotation: -12, delay: 17, size: 1.38, curve: 4 },
		{ shape: "ray", x: -19, y: 2, rotation: -72, delay: 14, size: .82, curve: -3 },
		{ shape: "ring", x: -13, y: -12, rotation: -24, delay: 6, size: .65, curve: 4 },
	],
	sparkle: [
		{ shape: "glint", x: 1, y: -19, rotation: 14, delay: 0, size: 1.25, curve: 3 },
		{ shape: "dot", x: 13, y: -13, rotation: 0, delay: 16, size: .68, curve: -4 },
		{ shape: "ray", x: 19, y: -2, rotation: 78, delay: 10, size: 1.15, curve: 3 },
		{ shape: "glint", x: 15, y: 12, rotation: 34, delay: 18, size: .76, curve: 4 },
		{ shape: "dot", x: 2, y: 18, rotation: 0, delay: 16, size: 1.38, curve: -3 },
		{ shape: "glint", x: -12, y: 15, rotation: -28, delay: 17, size: 1.05, curve: 4 },
		{ shape: "ray", x: -19, y: 3, rotation: -78, delay: 14, size: .82, curve: -3 },
		{ shape: "dot", x: -13, y: -12, rotation: 0, delay: 6, size: .72, curve: 4 },
	],
	sunray: [
		{ shape: "ray", x: 0, y: -20, rotation: 90, delay: 0, size: 1.05, curve: 1 },
		{ shape: "ray", x: 12, y: -16, rotation: 126, delay: 18, size: .82, curve: -1 },
		{ shape: "ray", x: 19, y: -6, rotation: 162, delay: 7, size: 1.18, curve: 1 },
		{ shape: "ray", x: 19, y: 7, rotation: 198, delay: 16, size: .9, curve: -1 },
		{ shape: "ray", x: 12, y: 17, rotation: 234, delay: 12, size: 1.08, curve: 1 },
		{ shape: "ray", x: 0, y: 21, rotation: 270, delay: 18, size: .78, curve: -1 },
		{ shape: "ray", x: -12, y: 17, rotation: 306, delay: 10, size: 1.14, curve: 1 },
		{ shape: "ray", x: -19, y: 7, rotation: 342, delay: 16, size: .86, curve: -1 },
		{ shape: "ray", x: -19, y: -6, rotation: 18, delay: 5, size: 1.02, curve: 1 },
		{ shape: "ray", x: -12, y: -16, rotation: 54, delay: 16, size: .74, curve: -1 },
	],
};

export function motionParticleStyle(particle: MotionBurstParticle) {
	const travelScale = .78;
	const destinationX = particle.x * travelScale;
	const destinationY = particle.y * travelScale;
	const distance = Math.hypot(destinationX, destinationY) || 1;
	const curve = particle.curve * .72;
	const middleX = destinationX * .58 + (-destinationY / distance) * curve;
	const middleY = destinationY * .58 + (destinationX / distance) * curve;
	return `--motion-x:${destinationX.toFixed(2)}px;--motion-y:${destinationY.toFixed(2)}px;--motion-mid-x:${middleX.toFixed(2)}px;--motion-mid-y:${middleY.toFixed(2)}px;--motion-rotation:${particle.rotation}deg;--motion-delay:${particle.delay}ms;--motion-size:${particle.size}`;
}

export function renderMotionBurstMarkup(
	variant: MotionBurstVariant = "default",
	color: MotionBurstColor = variant === "sparkle" ? "favorite" : "accent",
) {
	const particles = motionBurstParticles[variant]
		.map((particle) => `<i class="motion-burst__particle" data-motion-shape="${particle.shape}" style="${motionParticleStyle(particle)}"></i>`)
		.join("");
	return `<span class="motion-burst" data-motion-burst data-motion-variant="${variant}" data-motion-color="${color}" aria-hidden="true">${particles}</span>`;
}
