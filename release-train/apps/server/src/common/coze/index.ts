
// ========== Coze API 客户端 ==========
// 用于调用 Coze 平台的智能体 API
// 使用官方 SDK: https://github.com/coze-dev/coze-js

import { CozeAPI } from '@coze/api';

/**
 * Coze API 客户端配置
 */
export interface CozeConfig {
  apiKey: string;              // Coze API Key（PAT）
  workflowId: string;          // 工作流 ID
  baseURL?: string;            // API 基础 URL（可选，默认 https://api.coze.cn）
}

/**
 * Coze API 客户端
 */
export class CozeClient {
  private apiKey: string;
  private workflowId: string;
  private baseURL: string;
  private apiClient: CozeAPI;

  constructor(config: CozeConfig) {
    this.apiKey = config.apiKey;
    this.workflowId = config.workflowId;
    this.baseURL = config.baseURL || 'https://api.coze.cn';
    
    console.log('🔧 初始化 Coze 客户端...');
    console.log('  - Workflow ID:', this.workflowId);
    console.log('  - Base URL:', this.baseURL);
    
    // 初始化官方 Coze API 客户端
    this.apiClient = new CozeAPI({
      token: this.apiKey,
      baseURL: this.baseURL,
    });
  }

  /**
   * 运行工作流并获取响应
   * 处理 Coze 流式响应，提取最终的 JSON 输出
   */
  async runWorkflow(parameters: any): Promise<any> {
    try {
      console.log('🤖 开始调用 Coze 工作流...');
      console.log('📋 输入参数:', JSON.stringify(parameters, null, 2));
      
      // 使用官方 SDK 运行工作流
      const res = await this.apiClient.workflows.runs.stream({
        workflow_id: this.workflowId,
        parameters: {
          parameters: parameters,
        },
      });
      
      let result: any = null;
      const allEvents: any[] = [];
      
      // 处理流式响应
      for await (const part of res) {
        allEvents.push(part);
        
        // 只记录事件类型和节点信息，避免日志过长
        if (part.event) {
          console.log(`🔄 收到事件: ${part.event}`);
          
          // 对于 Message 事件，显示节点标题
          if (part.event === 'Message' && part.data) {
            const nodeTitle = part.data?.node_title || part.data?.nodeId || 'Unknown';
            console.log(`   📥 节点: ${nodeTitle}`);
          }
        }
        
        // 关键：提取 Message 事件中的 content 字段
        if (part.event === 'Message' && part.data?.content) {
          const content = part.data.content;
          console.log('📝 收到消息内容');
          
          // content 是一个 JSON 字符串，需要解析
          if (typeof content === 'string') {
            try {
              const parsed = JSON.parse(content);
              console.log('✅ 成功解析 content JSON');
              
              // 从 parsed 中提取 output 字段
              if (parsed?.output) {
                result = parsed.output;
                console.log('✅ 提取到 output 数据');
              } else {
                // 如果没有嵌套的 output，直接使用 parsed
                result = parsed;
                console.log('✅ 使用 parsed 作为结果');
              }
            } catch (e) {
              console.log('⚠️ content 不是有效 JSON，保留原样');
              result = content;
            }
          }
        }
        
        // Done 事件表示工作流结束
        if (part.event === 'Done') {
          console.log('✅ 工作流执行完成');
          if (part.data?.debug_url) {
            console.log('🔗 调试链接:', part.data.debug_url);
          }
          break;
        }
      }
      
      if (!result) {
        console.log('⚠️ 未找到最终输出，共收到', allEvents.length, '个事件');
      } else {
        console.log('✅ 最终输出:', JSON.stringify(result, null, 2));
      }
      
      return result;
    } catch (error) {
      console.error('❌ Coze 工作流执行错误:', error);
      throw new Error(`Coze API error: ${(error as Error).message}`);
    }
  }

  /**
   * 运行工作流并直接返回解析后的结果
   */
  async runWorkflowAndParse<T>(parameters: any): Promise<T> {
    const result = await this.runWorkflow(parameters);
    return result as T;
  }
}

/**
 * 全局 Coze 客户端实例
 */
let globalCozeClient: CozeClient | null = null;

/**
 * 初始化 Coze 客户端
 */
export function initCozeClient(config: CozeConfig) {
  globalCozeClient = new CozeClient(config);
}

/**
 * 获取 Coze 客户端
 */
export function getCozeClient(): CozeClient {
  if (!globalCozeClient) {
    throw new Error('Coze client not initialized. Call initCozeClient first');
  }
  return globalCozeClient;
}
