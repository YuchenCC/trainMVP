
// ========== Coze API 客户端 ==========
// 用于调用 Coze 平台的智能体 API
// 使用官方 SDK: https://github.com/coze-dev/coze-js

import { CozeAPI } from '@coze/api';

/**
 * Coze 工作流枚举
 */
export enum CozeWorkflow {
  SMART_ONBOARD = 'SMART_ONBOARD',   // 智能 onboard 工作流
  REQUIREMENT_REVIEW = 'REQUIREMENT_REVIEW',  // 需求审查工作流
}

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
  private workflowIds: Record<CozeWorkflow, string>;
  private baseURL: string;
  private apiClient: CozeAPI;

  constructor(config: { apiKey: string; baseURL?: string; workflowIds: Record<CozeWorkflow, string> }) {
    this.apiKey = config.apiKey;
    this.workflowIds = config.workflowIds;
    this.baseURL = config.baseURL || 'https://api.coze.cn';
    
    console.log('🔧 初始化 Coze 客户端...');
    console.log('  - Workflow IDs:', JSON.stringify(this.workflowIds));
    console.log('  - Base URL:', this.baseURL);
    
    // 初始化官方 Coze API 客户端
    this.apiClient = new CozeAPI({
      token: this.apiKey,
      baseURL: this.baseURL,
    });
  }

  /**
   * 获取指定工作流 ID
   */
  getWorkflowId(workflow: CozeWorkflow): string {
    const id = this.workflowIds[workflow];
    if (!id) {
      throw new Error(`Workflow ${workflow} not configured`);
    }
    return id;
  }

  /**
   * 运行指定工作流并获取响应
   */
  async runWorkflow(workflow: CozeWorkflow, parameters: any): Promise<any> {
    const workflowId = this.getWorkflowId(workflow);
    
    try {
      console.log(`🤖 开始调用 Coze 工作流 [${workflow}]...`);
      console.log('📋 输入参数:', JSON.stringify(parameters, null, 2));
      
      // 使用官方 SDK 运行工作流（SDK 自动包装 parameters，不要双重嵌套）
      const res = await this.apiClient.workflows.runs.stream({
        workflow_id: workflowId,
        parameters: parameters,
      });
      
      let result: any = null;
      const allEvents: any[] = [];
      
      // 处理流式响应
      for await (const part of res) {
        allEvents.push(part);
        
        if (part.event) {
          console.log(`🔄 收到事件: ${part.event}`);

          // 处理 Error 事件
          if (part.event === 'Error' && part.data) {
            const errorData = part.data as any;
            console.error('❌ Coze 工作流执行错误:', errorData);
            throw new Error(`Coze workflow error: ${JSON.stringify(errorData)}`);
          }

          if (part.event === 'Message' && part.data && typeof part.data === 'object') {
            const msgData = part.data as any;
            const nodeTitle = msgData?.node_title || msgData?.nodeId || 'Unknown';
            console.log(`   📥 节点: ${nodeTitle}`);
          }
        }
        
        // 提取 Message 事件中的 content 字段
        if (part.event === 'Message' && part.data && typeof part.data === 'object') {
          const msgData = part.data as any;
          const content = msgData?.content;
          if (content) {
            console.log('📝 收到消息内容');
            
            if (typeof content === 'string') {
              try {
                const parsed = JSON.parse(content);
                console.log('✅ 成功解析 content JSON');
                
                if (parsed?.output) {
                  result = parsed.output;
                  console.log('✅ 提取到 output 数据');
                } else {
                  result = parsed;
                  console.log('✅ 使用 parsed 作为结果');
                }
              } catch (e) {
                console.log('⚠️ content 不是有效 JSON，保留原样');
                result = content;
              }
            }
          }
        }
        
        // Done 或 workflow_finish 事件表示工作流结束
        const eventType = part.event as string;
        if ((eventType === 'Done' || eventType === 'workflow_finish') && part.data) {
          const eventData = part.data as any;
          let outputData = eventData;

          // 如果是 workflow_finish 事件，尝试解析 output 字段
          if (eventType === 'workflow_finish' && eventData.output) {
            let output = eventData.output;
            if (typeof output === 'string') {
              try {
                output = JSON.parse(output);
              } catch (e) {
                // 解析失败，保留原样
              }
            }
            if (output && output.output) {
              // 双重嵌套，取最内层
              outputData = typeof output.output === 'string' ? JSON.parse(output.output) : output.output;
            } else {
              outputData = output;
            }
          }

          if (outputData?.debug_url) {
            console.log('✅ 工作流执行完成');
            console.log('🔗 调试链接:', outputData.debug_url);
          }

          // 如果还没有 result，尝试从 outputData 中提取
          if (!result && typeof outputData === 'object') {
            if (outputData.output) {
              let output = outputData.output;
              if (typeof output === 'string') {
                try { output = JSON.parse(output); } catch (e) {}
              }
              if (output?.output) {
                result = typeof output.output === 'string' ? JSON.parse(output.output) : output.output;
              } else {
                result = output;
              }
            } else if (outputData.issues || outputData.suggestions) {
              result = outputData;
            }
          }

          if (eventType === 'Done') {
            break;
          }
        }
      }
      
      if (!result) {
        console.log('⚠️ 未找到最终输出，共收到', allEvents.length, '个事件');
      } else {
        console.log('✅ 最终输出:', JSON.stringify(result, null, 2));
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Coze 工作流 [${workflow}] 执行错误:`, error);
      throw new Error(`Coze API error: ${(error as Error).message}`);
    }
  }

  /**
   * 运行工作流并直接返回解析后的结果
   */
  async runWorkflowAndParse<T>(workflow: CozeWorkflow, parameters: any): Promise<T> {
    const result = await this.runWorkflow(workflow, parameters);
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
export function initCozeClient(config: { 
  apiKey: string; 
  baseURL?: string;
  workflowIds: Record<CozeWorkflow, string>;
}) {
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
