export type YouCamTaskResult = {
  imageBuffer: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
};

export type YouCamClient = {
  createTryOnTask(input: {
    basePhoto: Buffer;
    garmentImage: Buffer;
    garmentCategory: 'top' | 'outerwear';
  }): Promise<{ taskId: string }>;
  getTryOnTask(taskId: string): Promise<{ status: 'pending' | 'running' } | { status: 'succeeded'; result: YouCamTaskResult } | { status: 'failed' }>;
};

export const createUnavailableYouCamClient = (): YouCamClient => ({
  async createTryOnTask(): Promise<{ taskId: string }> {
    throw new Error('YouCam client is not configured.');
  },
  async getTryOnTask(): Promise<{ status: 'failed' }> {
    return { status: 'failed' };
  },
});
