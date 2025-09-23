/**
 * Utility functions for handling profile pictures and file uploads
 */

// Valid image file extensions
const VALID_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];

/**
 * Check if a filename has a valid image extension
 */
export function isValidImageFilename(filename: string): boolean {
  if (!filename) return false;
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return VALID_IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Get the full URL for a profile picture
 */
export function getProfilePictureUrl(filename: string | null | undefined): string | null {
  if (!filename) return null;
  
  // If it's already a full URL, return as is
  if (filename.startsWith('http')) return filename;
  
  // Construct URL to backend uploads directory
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  return `${baseUrl}/uploads/profile-pictures/${filename}`;
}

/**
 * Extract just the filename from a profile picture value
 */
export function getProfilePictureFilename(profilePicture: string | null | undefined): string | null {
  if (!profilePicture) return null;
  
  // If it's a full URL, extract just the filename
  if (profilePicture.includes('/')) {
    return profilePicture.substring(profilePicture.lastIndexOf('/') + 1);
  }
  
  return profilePicture;
}

/**
 * Upload a profile picture file
 */
export async function uploadProfilePicture(doctorId: string, file: File): Promise<{ success: boolean; filename?: string; message?: string }> {
  try {
    const formData = new FormData();
    formData.append('profilePicture', file);

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${baseUrl}/api/v1/doctors/${doctorId}/profile-picture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      return {
        success: true,
        filename: result.data?.profilePicture,
        message: result.message
      };
    } else {
      return {
        success: false,
        message: result.message || 'Failed to upload profile picture'
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to upload profile picture'
    };
  }
}

/**
 * Upload a medical record attachment
 */
export async function uploadMedicalRecordAttachment(recordId: string, file: File): Promise<{ success: boolean; filename?: string; message?: string }> {
  try {
    const formData = new FormData();
    formData.append('attachment', file);

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${baseUrl}/api/v1/medical-records/${recordId}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      return {
        success: true,
        filename: file.name,
        message: result.message
      };
    } else {
      return {
        success: false,
        message: result.message || 'Failed to upload attachment'
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to upload attachment'
    };
  }
}

/**
 * Get the download URL for a medical record attachment
 */
export function getMedicalAttachmentUrl(filename: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  return `${baseUrl}/uploads/medical-records/${filename}`;
}