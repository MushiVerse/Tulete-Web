import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';

export const storageService = {
  /**
   * Uploads a file to Firebase Storage and returns the download URL
   */
  async uploadFile(
    file: File, 
    path: string, 
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error) => {
          console.error("Storage upload error:", error);
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  },

  /**
   * Deletes a file from Firebase Storage given its full path or URL
   */
  async deleteFile(pathOrUrl: string): Promise<void> {
    try {
      // If it's a full URL, we need to extract the path, but Firebase provides 
      // a refFromURL method in older sdks, in modular we just create a ref 
      // directly if we have the gs:// or https:// url
      const fileRef = ref(storage, pathOrUrl);
      await deleteObject(fileRef);
    } catch (error) {
      console.error("Storage delete error:", error);
      throw error;
    }
  }
};
