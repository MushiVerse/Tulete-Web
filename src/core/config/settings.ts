import packageJson from '../../../package.json';

export const APP_SETTINGS = {
  version: packageJson.version,
  currency: import.meta.env.VITE_APP_CURRENCY || 'TZS',
  country: 'Tanzania',
  playStoreUrl: import.meta.env.VITE_PLAY_STORE_URL || 'https://go.tulete.net/link',
  socialLinks: {
    facebook: 'https://www.facebook.com/share/1BAsk78Dwy/',
    instagram: 'https://www.instagram.com/tulete_enterprises/',
    tiktok: 'https://www.tiktok.com/@tulete_enterprises',
    youtube: 'https://www.youtube.com/@tulete_enterprises',
  }
};
