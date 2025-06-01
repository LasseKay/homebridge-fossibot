export async function retry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 2000,
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return retry(fn, retries - 1, delay);
    }
}