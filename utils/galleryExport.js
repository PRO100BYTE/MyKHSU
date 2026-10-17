const UNAVAILABLE_PERMISSION = { status: 'unavailable' };

const getMediaLibrary = () => {
  try {
    // The package can be installed while the current native client does not contain its module.
    return require('expo-media-library');
  } catch (_error) {
    return null;
  }
};

const getPermissionOptions = () => ({
  writeOnly: true,
  // An empty list deliberately avoids requesting Android media read permissions.
  granularPermissions: [],
});

export const getGalleryPermission = async () => {
  const mediaLibrary = getMediaLibrary();
  if (!mediaLibrary || typeof mediaLibrary.getPermissionsAsync !== 'function') {
    return UNAVAILABLE_PERMISSION;
  }

  try {
    const { writeOnly, granularPermissions } = getPermissionOptions();
    return await mediaLibrary.getPermissionsAsync(writeOnly, granularPermissions);
  } catch (error) {
    if (/not available|unavailable|native module|cannot find|undefined is not a function/i.test(String(error?.message || error))) return UNAVAILABLE_PERMISSION;
    throw error;
  }
};

export const requestGalleryPermission = async () => {
  const mediaLibrary = getMediaLibrary();
  if (!mediaLibrary || typeof mediaLibrary.requestPermissionsAsync !== 'function') {
    return UNAVAILABLE_PERMISSION;
  }

  try {
    const { writeOnly, granularPermissions } = getPermissionOptions();
    return await mediaLibrary.requestPermissionsAsync(writeOnly, granularPermissions);
  } catch (error) {
    if (/not available|unavailable|native module|cannot find|undefined is not a function/i.test(String(error?.message || error))) return UNAVAILABLE_PERMISSION;
    throw error;
  }
};

export const saveScheduleImage = async (uri) => {
  if (!uri) {
    throw new Error('GALLERY_IMAGE_URI_MISSING');
  }

  const mediaLibrary = getMediaLibrary();
  if (!mediaLibrary || !mediaLibrary.Asset || typeof mediaLibrary.Asset.create !== 'function') {
    throw new Error('GALLERY_UNAVAILABLE');
  }

  // Capture output is already an image file; never fabricate an extension by
  // changing the URI, since that would point Asset.create at a nonexistent file.
  return mediaLibrary.Asset.create(uri);
};
