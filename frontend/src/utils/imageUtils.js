// Base64 encoded transparent 1x1 pixel PNG that works without any network requests
export const TRANSPARENT_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// Gray placeholder - light gray 50x50 pixel
export const GRAY_PLACEHOLDER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAA7UlEQVRoge3ZwQ3DIAwF0N+qE7QjdBNvwAaM0G7SbsAI3YCO0A0IoRxyqBAgccHYlXw7+ikJCIsQABjG9byeFM0RwARAiToA7ABWyqvtRmSFXAFMAGbKq40/EAkhSSGJIL4gHiFBEaEhQSB2KdUBJJK3B/kME7m5uvfnVv6nkrFJ7raQ2JBwkIiQ8BB/EBCrLuqk5PSC9Alv8Av5NxCoPhC6nwLlIsHIJOjWuQdJ+zV52uHlKjH9iD8ImT0Ie9CeJbsHpYcw+ghQeojxI7LxIFYP4c7RAVi8QGz6iHOQHqJ+IMEgoSBBIQGrS8oLAPwAuqJYJ2d/LEYAAAAASUVORK5CYII=';

/**
 * Returns a valid image URL even if the input is problematic
 * @param {string} imageUrl - The original image URL
 * @param {string} fallbackUrl - Optional fallback URL (defaults to transparent pixel)
 * @returns {string} - A valid image URL
 */
export const getSafeImageUrl = (imageUrl, fallbackUrl = '/placeholder-image.svg') => {
    // Debug the input
    console.log(`getSafeImageUrl input:`, imageUrl);
    
    // If imageUrl is undefined, null, empty string, or not a string
    if (!imageUrl || typeof imageUrl !== 'string') {
        console.log(`Using fallback for invalid URL: ${imageUrl}`);
        return fallbackUrl;
    }
    
    // If using placeholder.com, which can cause DNS issues
    if (imageUrl.includes('via.placeholder.com') || 
        imageUrl.includes('placeholder.com')) {
        console.log(`Replacing placeholder.com URL with local fallback: ${imageUrl}`);
        return fallbackUrl;
    }
    
    // If it's already the fallback or a data URL, use it directly
    if (imageUrl === fallbackUrl || imageUrl.startsWith('data:')) {
        return imageUrl;
    }
    
    // If it's an absolute URL, use it directly
    if (imageUrl.startsWith('http')) {
        return imageUrl;
    }
    
    // Use Vite's import.meta.env instead of process.env
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    // If it's a relative URL starting with '/'
    if (imageUrl.startsWith('/')) {
        // Check for /uploads/election_images/ which might already be part of the path
        if (imageUrl.includes('/uploads/election_images/') || 
            imageUrl.includes('/uploads/cvs/')) {
            const fullUrl = `${apiUrl}${imageUrl}`;
            console.log(`Converted relative URL to absolute: ${fullUrl}`);
            return fullUrl;
        }
        
        // For other paths, just prepend the API URL
        const fullUrl = `${apiUrl}${imageUrl}`;
        console.log(`Converted relative URL to absolute: ${fullUrl}`);
        return fullUrl;
    }
    
    // Otherwise assume it's a filename in the election_images directory
    const fullUrl = `${apiUrl}/uploads/election_images/${imageUrl}`;
    console.log(`Assumed filename in election_images: ${fullUrl}`);
    return fullUrl;
};

export default {
    TRANSPARENT_PIXEL,
    GRAY_PLACEHOLDER,
    getSafeImageUrl
}; 