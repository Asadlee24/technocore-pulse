/** Decorative traffic follows a rounded block perimeter; units are scene metres. */
export function roundedBlockPose(distance: number, half = 8.3, radius = 1.1) {
  const straight = 2 * (half - radius);
  const arc = Math.PI * radius / 2;
  const sideLength = straight + arc;
  const perimeter = sideLength * 4;
  const wrapped = ((distance % perimeter) + perimeter) % perimeter;
  const side = Math.floor(wrapped / sideLength);
  const local = wrapped - side * sideLength;
  let x: number, z: number, dx: number, dz: number;
  if (local < straight) {
    x = -(half - radius) + local; z = -half; dx = 1; dz = 0;
  } else {
    const angle = (local - straight) / radius - Math.PI / 2;
    x = half - radius + Math.cos(angle) * radius;
    z = -(half - radius) + Math.sin(angle) * radius;
    dx = -Math.sin(angle); dz = Math.cos(angle);
  }
  const angle = side * Math.PI / 2, c = Math.cos(angle), s = Math.sin(angle);
  return { x: x * c - z * s, z: x * s + z * c, dx: dx * c - dz * s, dz: dx * s + dz * c };
}

/** Common pace prevents vehicles sharing a block from overtaking each other. */
export function streetVehiclePose(time: number, index: number) {
  const half = 8.3, radius = 1.1;
  const sideLength = 2 * (half - radius) + Math.PI * radius / 2;
  // A brief intersection pause, with a cosine ease at departure/arrival.
  const cycle = 16, moving = 13;
  const clock = time + (index % 48) * 1.73 + Math.floor(index / 48) * cycle * 2;
  const side = Math.floor(clock / cycle);
  const phase = Math.min(((clock % cycle) + cycle) % cycle / moving, 1);
  const travelled = phase - Math.sin(phase * Math.PI * 2) / (Math.PI * 2);
  return roundedBlockPose((side + travelled) * sideLength, half, radius);
}
