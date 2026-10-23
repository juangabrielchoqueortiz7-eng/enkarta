/** Exact Lottie URLs observed in Primicia. Local files preserve original bytes. */
const source = 'https://invitali.com/wp-content/uploads/';
const original = (file: string, reverse = true, localPath = '/lottie/invitali-originales/' + file.replaceAll('/', '-')) => ({
  source: source + file, localPath, reverse,
});

export const CAPITULO_ORIGINALS = {
  bride: original('2025/05/novia.json', false),
  groom: original('2025/05/marido.json', false),
  ceremony: original('2025/05/17-Iglesia.json'),
  reception: original('2025/05/11-recepcion-social.json'),
  firstDance: original('2025/05/vals.json'),
  dinner: original('2025/05/14-Cena.json'),
  dance: original('2025/05/baile.json'),
  farewell: original('2025/05/23-adios-fin-de-fiesta-1.json'),
  suit: original('2025/05/chaqueta-de-sport.json'),
  dress: original('2025/05/vestido-de-novia.json'),
  location: original('2025/05/Lugar-03.json'),
  adults: original('2025/05/10-no-ninos.json', true, '/lottie/boda/invitali-sin-ninos-original.json'),
  gift: original('2025/05/37-regalo-1.json', false),
} as const;
