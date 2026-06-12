const MAX_CHUNK_LENGTH = 1900;

export const splitMessage = (text: string): string[] => {
  const chunks: string[] = [];

  for (let i = 0; i < text.length; i += MAX_CHUNK_LENGTH) {
    chunks.push(text.slice(i, i + MAX_CHUNK_LENGTH));
  }

  return chunks.length > 0 ? chunks : ["(empty output)"];
};
