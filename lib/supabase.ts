export const uploadFile = async (
  bucket: string,
  fileName: string,
  file: File
): Promise<string | null> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => {
      console.error('Failed to read file');
      resolve(null);
    };
  });
};

export const deleteFile = async (
  bucket: string,
  fileName: string
): Promise<boolean> => {
  return true;
};