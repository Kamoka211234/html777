/**
 * Manages application performance by measuring event loop lag 
 * and injecting artificial delays to throttle high CPU usage.
 * 
 * Logic based on requirement:
 * "while lag instead of lagging add delay , when performance below 70% stop delaying , after that just try to handle and make it below 70%"
 */

class PerformanceManager {
    private loadRatio: number = 0; 
    private currentDelayMs: number = 0;
    private maxDelayMs: number = 1000;
    private checkInterval: number = 50;
    private isRunning: boolean = false;

    constructor() {
        this.startMonitoring();
    }

    private startMonitoring() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.loop();
    }

    private loop() {
        const expectedStart = performance.now() + this.checkInterval;
        
        setTimeout(() => {
            const actualStart = performance.now();
            const lag = Math.max(0, actualStart - expectedStart);
            
            // Normalize lag (e.g. 50ms lag = 100% load roughly for responsive UI)
            const currentLoad = Math.min(1.0, lag / 50.0);
            
            // Smooth load average
            this.loadRatio = (this.loadRatio * 0.8) + (currentLoad * 0.2);
            
            // If resource usage (load) is > 70%, increase delay
            if (this.loadRatio > 0.70) {
                this.currentDelayMs = Math.min(this.currentDelayMs + 25, this.maxDelayMs);
            } else {
                // Return to normal execution (stop delaying) when performance is "below 70%"
                this.currentDelayMs = Math.max(0, this.currentDelayMs - 50);
            }

            if (this.isRunning) {
                this.loop();
            }
        }, this.checkInterval);
    }

    public stopMonitoring() {
        this.isRunning = false;
    }

    public getLoadPercentage(): number {
        return Math.round(this.loadRatio * 100);
    }

    public getCurrentDelay(): number {
        return this.currentDelayMs;
    }

    /**
     * Call this inside heavy loops or before intensive tasks.
     * It will wait an appropriate amount of time to let the browser breath
     * if the performance load is above 70%.
     */
    public async handleLag(): Promise<void> {
        if (this.currentDelayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, this.currentDelayMs));
        }
    }
}

export const perfManager = new PerformanceManager();
