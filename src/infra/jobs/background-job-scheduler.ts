export interface BackgroundJob {
  id: string;
  name: string;
  schedule: string;        // Cron-like schedule or interval
  handler: () => Promise<void>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  stats: {
    runs: number;
    failures: number;
    avgDuration: number;
    lastError?: string;
  };
}

export class BackgroundJobScheduler {
  private jobs = new Map<string, BackgroundJob>();
  private intervals = new Map<string, NodeJS.Timeout>();
  private running = false;

  constructor() {
    this.setupDefaultJobs();
  }

  start(): void {
    if (this.running) return;
    
    this.running = true;
    console.log('Background job scheduler started');

    // Start all enabled jobs
    for (const job of this.jobs.values()) {
      if (job.enabled) {
        this.scheduleJob(job);
      }
    }
  }

  stop(): void {
    this.running = false;
    
    // Clear all intervals
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
    
    console.log('Background job scheduler stopped');
  }

  addJob(job: BackgroundJob): void {
    this.jobs.set(job.id, job);
    
    if (this.running && job.enabled) {
      this.scheduleJob(job);
    }
  }

  removeJob(jobId: string): void {
    const interval = this.intervals.get(jobId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(jobId);
    }
    this.jobs.delete(jobId);
  }

  enableJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = true;
      if (this.running) {
        this.scheduleJob(job);
      }
    }
  }

  disableJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = false;
      const interval = this.intervals.get(jobId);
      if (interval) {
        clearInterval(interval);
        this.intervals.delete(jobId);
      }
    }
  }

  getJobStats(): Array<{
    id: string;
    name: string;
    enabled: boolean;
    lastRun?: Date;
    nextRun?: Date;
    stats: BackgroundJob['stats'];
  }> {
    return Array.from(this.jobs.values()).map(job => ({
      id: job.id,
      name: job.name,
      enabled: job.enabled,
      lastRun: job.lastRun,
      nextRun: job.nextRun,
      stats: job.stats,
    }));
  }

  private scheduleJob(job: BackgroundJob): void {
    // Simple interval-based scheduling
    let intervalMs: number;
    
    switch (job.schedule) {
      case 'hourly':
        intervalMs = 60 * 60 * 1000;
        break;
      case 'daily':
        intervalMs = 24 * 60 * 60 * 1000;
        break;
      case 'weekly':
        intervalMs = 7 * 24 * 60 * 60 * 1000;
        break;
      default:
        // Parse as minutes
        const minutes = parseInt(job.schedule);
        intervalMs = (isNaN(minutes) ? 60 : minutes) * 60 * 1000;
    }

    job.nextRun = new Date(Date.now() + intervalMs);
    
    const interval = setInterval(async () => {
      await this.executeJob(job);
    }, intervalMs);

    this.intervals.set(job.id, interval);
  }

  private async executeJob(job: BackgroundJob): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`Executing job: ${job.name}`);
      
      await job.handler();
      
      // Update success stats
      job.stats.runs += 1;
      job.lastRun = new Date();
      job.nextRun = new Date(Date.now() + this.getJobInterval(job.schedule));
      
      const duration = Date.now() - startTime;
      job.stats.avgDuration = (job.stats.avgDuration * (job.stats.runs - 1) + duration) / job.stats.runs;
      
      console.log(`Job ${job.name} completed in ${duration}ms`);
      
    } catch (error) {
      // Update failure stats
      job.stats.failures += 1;
      job.stats.lastError = error instanceof Error ? error.message : String(error);
      
      console.error(`Job ${job.name} failed:`, error);
    }
  }

  private getJobInterval(schedule: string): number {
    switch (schedule) {
      case 'hourly': return 60 * 60 * 1000;
      case 'daily': return 24 * 60 * 60 * 1000;
      case 'weekly': return 7 * 24 * 60 * 60 * 1000;
      default:
        const minutes = parseInt(schedule);
        return (isNaN(minutes) ? 60 : minutes) * 60 * 1000;
    }
  }

  private setupDefaultJobs(): void {
    // Default jobs for memory maintenance
    this.addJob({
      id: 'summarize-old-episodes',
      name: 'Summarize Old Episodes',
      schedule: 'daily',
      enabled: true,
      handler: async () => {
        console.log('Running episodic memory summarization...');
        // TODO: Implement episodic memory summarization
      },
      stats: {
        runs: 0,
        failures: 0,
        avgDuration: 0,
      },
    });

    this.addJob({
      id: 'update-memory-policies',
      name: 'Update Memory Policies',
      schedule: 'weekly',
      enabled: true,
      handler: async () => {
        console.log('Updating memory policies...');
        // TODO: Implement policy effectiveness updates
      },
      stats: {
        runs: 0,
        failures: 0,
        avgDuration: 0,
      },
    });

    this.addJob({
      id: 'compress-old-content',
      name: 'Compress Old Content',
      schedule: '360', // Every 6 hours
      enabled: true,
      handler: async () => {
        console.log('Compressing old content...');
        // TODO: Implement content compression for old files
      },
      stats: {
        runs: 0,
        failures: 0,
        avgDuration: 0,
      },
    });

    this.addJob({
      id: 'rebuild-summaries',
      name: 'Rebuild Project Summaries',
      schedule: 'weekly',
      enabled: false, // Disabled by default as it's resource intensive
      handler: async () => {
        console.log('Rebuilding project summaries...');
        // TODO: Implement summary rebuilding
      },
      stats: {
        runs: 0,
        failures: 0,
        avgDuration: 0,
      },
    });
  }
}