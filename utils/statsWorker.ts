
const workerCode = `
self.onmessage = function(e) {
  const files = e.data;
  let count = 0;
  if (Array.isArray(files)) {
      for (let i = 0; i < files.length; i++) {
          const f = files[i];
          if (f.content && typeof f.content === 'string') {
              // Only count text content length
              count += f.content.length;
          }
      }
  }
  self.postMessage(count);
};
`;

export const createStatsWorker = (): Worker => {
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};
