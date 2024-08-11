

export interface NumberProvider {
  getNumber: () => number;
}


export class ProviderConverter {
  static ensureNumberProvider(numberOrProvider: number | NumberProvider): NumberProvider {
    if (typeof numberOrProvider === 'number') {
      return {
        getNumber: () => numberOrProvider,
      }
    } else {
      return numberOrProvider;
    }
  }
}
