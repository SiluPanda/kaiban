import type { PithPlugin } from './registry';

export const examplePlugin: PithPlugin = {
  name: 'example-logger',
  version: '1.0.0',
  hooks: {
    'task.created': (_event, data) => {
      console.log('[example-plugin] Task created:', (data as any)?.title);
    },
    'task.updated': (_event, data) => {
      console.log('[example-plugin] Task updated:', (data as any)?.id);
    },
  },
  onLoad: () => {
    console.log('[example-plugin] Loaded');
  },
  onUnload: () => {
    console.log('[example-plugin] Unloaded');
  },
};
