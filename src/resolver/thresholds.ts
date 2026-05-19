export interface ResolverThresholds {
  tauHigh: number;
  tauLow: number;
  gapDelta: number;
  topK: number;
  embeddingRefreshThreshold: number;
}

export const defaultThresholds: ResolverThresholds = {
  tauHigh: 0.88,
  tauLow: 0.65,
  gapDelta: 0.05,
  topK: 5,
  embeddingRefreshThreshold: 5
};
