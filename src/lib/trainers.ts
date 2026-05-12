// Trainer image lookup with Skelly fallback.

const KNOWN_TRAINERS = ['Aaron', 'Emma', 'Jesse', 'Saxon', 'Tim', 'Tommy'];
const SKELLY_PATH = '/images/trainer-cutouts/eqc-perth-trainer-cutout-Skelly-cut-out.PNG';

export function getTrainerImagePath(trainerName?: string): string {
  if (!trainerName) return SKELLY_PATH;
  const firstName = trainerName.split(' ')[0];
  const match = KNOWN_TRAINERS.find(t => t.toLowerCase() === firstName.toLowerCase());
  return match
    ? `/images/trainer-cutouts/eqc-perth-trainer-cutout-${match}-cut-out.PNG`
    : SKELLY_PATH;
}

export { KNOWN_TRAINERS, SKELLY_PATH };
