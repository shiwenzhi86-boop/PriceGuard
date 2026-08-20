/**
 * Cookie 管理器
 * 支持 Cookie 导入/导出、用户数据目录备份/恢复
 */

import fs from 'fs';
import path from 'path';
import type { Platform, PlatformCookie } from './types';

const PROFILE_DIR = path.join(process.env.COZE_WORKSPACE_PATH || '/workspace/projects', 'data', 'browser-profile');
const BACKUP_DIR = path.join(process.env.COZE_WORKSPACE_PATH || '/workspace/projects', 'data', 'backups');

/**
 * 导出 Cookie（从数据库）
 */
export async function exportCookies(platform: Platform): Promise<string> {
  const { getPlatformCookie } = await import('./db');
  
  const cookieData = await getPlatformCookie(platform);
  
  if (!cookieData) {
    return JSON.stringify({ platform, cookies: [], message: '未找到 Cookie' });
  }
  
  return cookieData.cookie;
}

/**
 * 导入 Cookie（到数据库）
 */
export async function importCookies(platform: Platform, cookieJson: string): Promise<{ success: boolean; message: string }> {
  try {
    // 验证 JSON 格式
    JSON.parse(cookieJson);
    
    const { savePlatformCookie } = await import('./db');
    await savePlatformCookie(platform, cookieJson);
    
    return { success: true, message: 'Cookie 导入成功' };
  } catch (error: any) {
    return { success: false, message: `Cookie 导入失败：${error.message}` };
  }
}

/**
 * 备份用户数据目录
 */
export async function backupProfile(): Promise<{ success: boolean; message: string; backupPath?: string }> {
  try {
    const fs = await import('fs');
    
    // 创建备份目录
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    // 生成备份文件名（带时间戳）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `browser-profile-${timestamp}`;
    const backupPath = path.join(BACKUP_DIR, backupName);
    
    // 复制用户数据目录
    if (fs.existsSync(PROFILE_DIR)) {
      copyDirSync(PROFILE_DIR, backupPath);
      return { 
        success: true, 
        message: `备份成功：${backupName}`,
        backupPath 
      };
    } else {
      return { success: false, message: '用户数据目录不存在' };
    }
  } catch (error: any) {
    return { success: false, message: `备份失败：${error.message}` };
  }
}

/**
 * 恢复用户数据目录
 */
export async function restoreProfile(backupPath: string): Promise<{ success: boolean; message: string }> {
  try {
    const fs = await import('fs');
    
    if (!fs.existsSync(backupPath)) {
      return { success: false, message: '备份文件不存在' };
    }
    
    // 删除当前用户数据目录
    if (fs.existsSync(PROFILE_DIR)) {
      fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
    }
    
    // 复制备份到用户数据目录
    copyDirSync(backupPath, PROFILE_DIR);
    
    return { success: true, message: '恢复成功' };
  } catch (error: any) {
    return { success: false, message: `恢复失败：${error.message}` };
  }
}

/**
 * 获取备份列表
 */
export async function getBackupList(): Promise<{ name: string; path: string; date: string }[]> {
  const fs = await import('fs');
  
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }
  
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(name => name.startsWith('browser-profile-'))
    .map(name => {
      const backupPath = path.join(BACKUP_DIR, name);
      const stats = fs.statSync(backupPath);
      return {
        name,
        path: backupPath,
        date: stats.mtime.toISOString(),
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return backups;
}

/**
 * 递归复制目录
 */
function copyDirSync(src: string, dest: string) {
  const fs = require('fs');
  fs.mkdirSync(dest, { recursive: true });
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
