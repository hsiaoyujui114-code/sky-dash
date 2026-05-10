export class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

export const generateWorldCode = (seed: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  let value = seed;
  for (let i = 0; i < 6; i++) {
    code = chars.charAt(value % 36) + code;
    value = Math.floor(value / 36);
  }
  return code;
};

export const codeToSeed = (code: string): number => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let value = 0;
  for (let i = 0; i < code.length; i++) {
    const index = chars.indexOf(code[i].toUpperCase());
    value = value * 36 + (index >= 0 ? index : 0);
  }
  return value % 233280;
};
