/**
 * 抓取任务队列
 * 串行执行抓取任务，避免并发触发风控
 */

import type { Product, Platform } from './types';

export interface FetchTask {
  productId: string;
  platform: Platform;
  url: string;
  priority: number; // 优先级（目标价接近的优先）
  retryCount: number;
}

export interface FetchQueueState {
  items: FetchTask[];
  isRunning: boolean;
  currentTask: FetchTask | null;
  completedCount: number;
  failedCount: number;
}

class FetchQueue {
  private items: FetchTask[] = [];
  private isRunning = false;
  private currentTask: FetchTask | null = null;
  private completedCount = 0;
  private failedCount = 0;
  private onTaskComplete?: (task: FetchTask, success: boolean) => void;

  /**
   * 添加任务到队列
   */
  addTask(task: FetchTask) {
    this.items.push(task);
    // 按优先级排序（优先级高的在前）
    this.items.sort((a, b) => b.priority - a.priority);
    console.log(`[FetchQueue] 添加任务：${task.productId}，优先级：${task.priority}，队列长度：${this.items.length}`);
  }

  /**
   * 批量添加任务
   */
  addTasks(tasks: FetchTask[]) {
    for (const task of tasks) {
      this.addTask(task);
    }
  }

  /**
   * 设置任务完成回调
   */
  setOnTaskComplete(callback: (task: FetchTask, success: boolean) => void) {
    this.onTaskComplete = callback;
  }

  /**
   * 获取队列状态
   */
  getState(): FetchQueueState {
    return {
      items: [...this.items],
      isRunning: this.isRunning,
      currentTask: this.currentTask,
      completedCount: this.completedCount,
      failedCount: this.failedCount,
    };
  }

  /**
   * 清空队列
   */
  clear() {
    this.items = [];
    this.completedCount = 0;
    this.failedCount = 0;
    console.log('[FetchQueue] 队列已清空');
  }

  /**
   * 处理队列（串行执行）
   */
  async process(fetchFn: (task: FetchTask) => Promise<boolean>) {
    if (this.isRunning) {
      console.log('[FetchQueue] 队列正在运行中，跳过');
      return;
    }

    this.isRunning = true;
    console.log(`[FetchQueue] 开始处理队列，共 ${this.items.length} 个任务`);

    while (this.items.length > 0) {
      const task = this.items.shift();
      if (!task) continue;

      this.currentTask = task;
      console.log(`[FetchQueue] 开始处理任务：${task.productId}（重试次数：${task.retryCount}）`);

      try {
        const success = await fetchFn(task);
        if (success) {
          this.completedCount++;
          console.log(`[FetchQueue] 任务成功：${task.productId}`);
        } else {
          this.failedCount++;
          console.log(`[FetchQueue] 任务失败：${task.productId}`);
          
          // 如果重试次数未达到上限，重新加入队列
          if (task.retryCount < 2) {
            task.retryCount++;
            this.items.push(task);
            console.log(`[FetchQueue] 任务重新加入队列：${task.productId}，重试次数：${task.retryCount}`);
          }
        }
        
        this.onTaskComplete?.(task, success);
      } catch (error) {
        this.failedCount++;
        console.error(`[FetchQueue] 任务异常：${task.productId}`, error);
        this.onTaskComplete?.(task, false);
      }

      this.currentTask = null;

      // 任务间随机延迟（5-12 秒）
      if (this.items.length > 0) {
        const delay = Math.floor(Math.random() * 7000) + 5000;
        console.log(`[FetchQueue] 等待 ${delay / 1000} 秒后继续...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    this.isRunning = false;
    console.log(`[FetchQueue] 队列处理完成，成功：${this.completedCount}，失败：${this.failedCount}`);
  }

  /**
   * 是否正在运行
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * 获取队列长度
   */
  getLength(): number {
    return this.items.length;
  }
}

// 单例
export const fetchQueue = new FetchQueue();
