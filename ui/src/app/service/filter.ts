import { NumberProvider, ProviderConverter } from "../types/providers";

export class LowPassFilter implements Filter {
  private cutoffFrequency: NumberProvider;
  private prevOutput: number;
  private previousTime: number;

  constructor(cutoffFrequency: number | NumberProvider) {
    this.cutoffFrequency = ProviderConverter.ensureNumberProvider(cutoffFrequency);
  }

  process(input: number, time: number): number {
    if (this.prevOutput == null) {
      this.prevOutput = input;
      this.previousTime = time;
      return input;
    }

    const RC = 1 / (2 * Math.PI * this.cutoffFrequency.getNumber());
    const dt = (time - this.previousTime) / 1000;
    const alpha = dt / (RC + dt);

    const output = alpha * input + (1 - alpha) * this.prevOutput;
    this.prevOutput = output;
    this.previousTime = time;

    return output;
  }
}


// This accounts for the fact that 359 degrees and 1 degree are almost 
// identical headings, but when expressed as numbers are very far apart.
export class HeadingFilter implements Filter {
  private xFilter: LowPassFilter;
  private yFilter: LowPassFilter;

  constructor(cutoffFrequency: number | NumberProvider) {
    this.xFilter = new LowPassFilter(cutoffFrequency)
    this.yFilter = new LowPassFilter(cutoffFrequency)
  }


  process(headingDegrees: number, time: number): number {
    let x = Math.cos(headingDegrees * Math.PI / 180);
    let y = Math.sin(headingDegrees * Math.PI / 180);
    let xFiltered = this.xFilter.process(x, time);
    let yFiltered = this.yFilter.process(y, time);

    return Math.atan2(yFiltered, xFiltered) * 180 / Math.PI;
  }
}




export class ChainedFilter implements Filter {

  filters: LowPassFilter[] = []

  constructor(cutoffFrequency: number, nests: number) {
    for (let i = 0; i < nests; i++) {
      this.filters.push(new LowPassFilter(cutoffFrequency));
    }
  }

  process(input: number, time: number): number {
    let filteredResult: number;
    for (let i = 0; i < this.filters.length; i++) {
      const filter = this.filters[i];
      if (i === 0)
        filteredResult = filter.process(input, time);
      else
        filteredResult = filter.process(filteredResult, time);
    }

    return filteredResult;
  }
}


export class NotAFilter implements Filter {
  process(input: number, _time: number): number {
    return input;
  }
}


export interface Filter {
  process(input: number, time: number): number;
}
