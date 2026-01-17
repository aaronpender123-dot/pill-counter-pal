import { useState, useCallback } from 'react';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export function useNativeCamera() {
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const isNative = Capacitor.isNativePlatform();

  const checkAndRequestPermission = useCallback(async (): Promise<boolean> => {
    if (!isNative) {
      // On web, permissions are handled by the browser
      setPermissionGranted(true);
      return true;
    }

    try {
      // Check current permission status
      const status = await CapacitorCamera.checkPermissions();
      
      if (status.camera === 'granted') {
        setPermissionGranted(true);
        return true;
      }

      if (status.camera === 'denied') {
        // Permission was denied previously - user needs to go to settings
        setPermissionGranted(false);
        return false;
      }

      // Request permission - this triggers the native iOS popup
      const requestResult = await CapacitorCamera.requestPermissions({ permissions: ['camera'] });
      
      const granted = requestResult.camera === 'granted';
      setPermissionGranted(granted);
      return granted;
    } catch (error) {
      console.error('Error checking camera permissions:', error);
      setPermissionGranted(false);
      return false;
    }
  }, [isNative]);

  const openSettings = useCallback(() => {
    // On iOS, we can't programmatically open settings, but we can inform the user
    // The app will need to guide users to Settings > Privacy > Camera
  }, []);

  return {
    isNative,
    permissionGranted,
    checkAndRequestPermission,
    openSettings,
  };
}
