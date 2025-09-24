import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  onModuleInit() {
    this.client = new Redis({ host: '127.0.0.1', port: 6379 });
    console.log('✅ Redis connected');
  }

  onModuleDestroy() {
    this.client.quit();
  }

  async set(key: string, value: any, expireSeconds?: number) {
    const val = typeof value === 'string' ? value : JSON.stringify(value);
    if (expireSeconds) {
      await this.client.set(key, val, 'EX', expireSeconds);
    } else {
      await this.client.set(key, val);
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as any;
    }
  }

  async del(key: string) {
    await this.client.del(key);
  }
}
