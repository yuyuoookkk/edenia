/**
 * Adafruit IO REST API client
 *
 * Fetches feed data from Adafruit IO for the attendance system.
 * Used by: /api/attendance/* routes
 *
 * Adafruit IO REST API docs: https://io.adafruit.com/api/docs/
 */

const AIO_BASE_URL = "https://io.adafruit.com/api/v2";

function getCredentials() {
    const username = process.env.AIO_USERNAME;
    const key = process.env.AIO_KEY;

    if (!username || !key || username === "YOUR_AIO_USERNAME") {
        return null;
    }
    return { username, key };
}

/**
 * Fetch the latest N data points from an Adafruit IO feed.
 */
export async function fetchFeedData(
    feedKey: string,
    limit: number = 50
): Promise<Record<string, unknown>[]> {
    const creds = getCredentials();
    if (!creds) return [];

    const url = `${AIO_BASE_URL}/${creds.username}/feeds/${feedKey}/data?limit=${limit}`;

    try {
        const res = await fetch(url, {
            headers: { "X-AIO-Key": creds.key },
            next: { revalidate: 10 }, // Cache for 10 seconds
        });

        if (!res.ok) {
            console.error(
                `[AIO] Failed to fetch feed "${feedKey}": ${res.status} ${res.statusText}`
            );
            return [];
        }

        const data = await res.json();

        // Each data point has { id, value, feed_key, created_at, ... }
        // The "value" field contains our JSON string payload
        return data.map((point: { value: string; created_at: string }) => {
            try {
                return {
                    ...JSON.parse(point.value),
                    _createdAt: point.created_at,
                };
            } catch {
                return { raw: point.value, _createdAt: point.created_at };
            }
        });
    } catch (error) {
        console.error(`[AIO] Error fetching feed "${feedKey}":`, error);
        return [];
    }
}

/**
 * Fetch the latest single value from a feed.
 */
export async function fetchLatestFeedValue(
    feedKey: string
): Promise<Record<string, unknown> | null> {
    const data = await fetchFeedData(feedKey, 1);
    return data.length > 0 ? data[0] : null;
}

/**
 * Check if Adafruit IO is configured.
 */
export function isAdafruitConfigured(): boolean {
    return getCredentials() !== null;
}
