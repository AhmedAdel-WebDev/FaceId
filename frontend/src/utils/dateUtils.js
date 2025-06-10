/**
 * Formats an ISO date string or Date object into a more readable format.
 * Example: "October 26, 2023, 10:30 AM"
 * @param {string | Date} dateInput - The date string or Date object to format.
 * @returns {string} - The formatted date string, or "Invalid Date" if input is invalid.
 */
export const formatDate = (dateInput) => {
    if (!dateInput) return 'N/A'; // Handle null or undefined input

    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
        return 'Invalid Date'; // Handle invalid date strings
    }

    // Use Intl.DateTimeFormat for locale-aware formatting
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true, // Use AM/PM
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
};

/**
 * Determines the current status of an election based on its dates and stored status.
 * Prioritizes DB status ('cancelled', 'completed', 'pending', 'active') before date calculations.
 * @param {string | Date} startDateInput - The election start date.
 * @param {string | Date} endDateInput - The election end date.
 * @param {string} currentDbStatus - The status stored in the database ('pending', 'active', 'completed', 'cancelled').
 * @returns {string} - The calculated status ('upcoming', 'active', 'completed', 'pending', 'cancelled').
 */
export const getStatus = (startDateInput, endDateInput, currentDbStatus) => {
    // 1. Prioritize terminal statuses from DB
    if (currentDbStatus === 'cancelled') {
        return 'cancelled';
    }
    if (currentDbStatus === 'completed') {
        return 'completed';
    }

    // 2. Prioritize 'pending' status from DB
    // This ensures the application phase is respected even if current time is within start/end dates
    if (currentDbStatus === 'pending') {
        return 'pending';
    }

    const now = new Date();
    const startDate = new Date(startDateInput);
    const endDate = new Date(endDateInput);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn("Invalid start or end date provided to getStatus");
        // Fallback to DB status if dates are invalid, or 'pending' if DB status is also missing/invalid
        return currentDbStatus || 'pending';
    }

    // 3. Prioritize 'active' status from DB if election hasn't ended
    // (Allows admin to force active early)
    if (currentDbStatus === 'active' && now < endDate) {
         return 'active';
    }

    // 4. Date-based calculation (only if DB status didn't override)
    if (now < startDate) {
        // If it hasn't started yet, it's 'upcoming'
        // (We already handled 'pending' above)
        return 'upcoming';
    } else if (now >= startDate && now < endDate) {
        // If within the date range, it should be 'active'
        // (We already handled 'pending' and explicit 'active' from DB above)
        return 'active';
    } else { // now >= endDate
        // If the end date has passed, it's 'completed'
        // (We already handled explicit 'completed' from DB above)
        return 'completed';
    }
};